import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './auth';

interface AuditLogData {
  userId?: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  resourceId?: string;
  changes?: any;
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(
  data: AuditLogData,
  req?: Request
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        changes: data.changes ? JSON.stringify(data.changes) : null,
        ipAddress: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Audit log error:', error);
  }
}

/**
 * Middleware to automatically log certain actions
 * Usage: router.delete('/resource/:id', auditLogMiddleware('resource', 'delete'), handler)
 */
export function auditLogMiddleware(
  resource: string,
  action: 'create' | 'update' | 'delete'
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (data: any): Response {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.userId;
        const resourceId = req.params.id || req.body.id;

        createAuditLog(
          {
            userId,
            action,
            resource,
            resourceId,
            changes: action === 'update' ? req.body : undefined,
          },
          req
        ).catch(() => {}); // Fire and forget
      }

      return originalSend.call(this, data);
    };

    next();
  };
}
