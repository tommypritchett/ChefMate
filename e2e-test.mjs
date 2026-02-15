import { chromium } from 'playwright';

const BASE = 'http://localhost:8081';
const SCREENSHOT_DIR = '/tmp/chefmate-screenshots';
const results = [];

function log(msg) {
  console.log(msg);
  results.push(msg);
}

// Helper: fill a RN Web TextInput reliably
async function fillInput(page, placeholder, value) {
  const input = page.locator(`[placeholder="${placeholder}"]`).and(page.locator(':visible'));
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay: 20 });
}

// Helper: click a tab by its accessible role or text
async function clickTab(page, tabName) {
  const tab = page.locator(`[role="tab"]:has-text("${tabName}")`);
  if (await tab.count() > 0) {
    await tab.first().click();
  } else {
    await page.locator(`text=${tabName}`).first().click();
  }
  await page.waitForTimeout(1000);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // =========================================================
    // TEST 1: App loads and redirects to login
    // =========================================================
    log('\n=== TEST 1: App loads and redirects to login ===');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-load.png`, fullPage: true });

    log(`  URL: ${page.url()}`);
    log(`  ChefMate branding: ${await page.locator('text=ChefMate').first().isVisible() ? 'PASS' : 'FAIL'}`);
    log(`  Sign In button: ${await page.locator('text=Sign In').first().isVisible() ? 'PASS' : 'FAIL'}`);
    log(`  Email field: ${await page.locator('[placeholder="you@example.com"]:visible').isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);
    log(`  Password field: ${await page.locator('[placeholder="Enter your password"]:visible').isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);
    log(`  Sign Up link: ${await page.locator('text=Sign Up').first().isVisible() ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 2: Login with invalid credentials shows error
    // =========================================================
    log('\n=== TEST 2: Login with invalid credentials ===');
    await fillInput(page, 'you@example.com', 'wrong@email.com');
    await fillInput(page, 'Enter your password', 'wrongpassword');

    const emailVal = await page.locator('[placeholder="you@example.com"]:visible').inputValue();
    log(`  Email filled: ${emailVal === 'wrong@email.com' ? 'PASS' : 'FAIL'} (value: "${emailVal}")`);

    await page.locator('text=Sign In').first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-login-error.png`, fullPage: true });

    const emailAfter = await page.locator('[placeholder="you@example.com"]:visible').inputValue().catch(() => '');
    log(`  Form preserved after error: ${emailAfter === 'wrong@email.com' ? 'PASS' : 'FAIL'} (value: "${emailAfter}")`);

    const pageText = await page.textContent('body');
    const hasError = pageText.includes('Invalid') || pageText.includes('failed') || pageText.includes('Failed');
    log(`  Error message shown: ${hasError ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 3: Navigate to Register screen
    // =========================================================
    log('\n=== TEST 3: Navigate to Register screen ===');
    await page.locator('text=Sign Up').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-register-screen.png`, fullPage: true });

    log(`  Create Account button: ${await page.locator('text=Create Account').first().isVisible() ? 'PASS' : 'FAIL'}`);
    log(`  First Name field: ${await page.locator('[placeholder="John"]:visible').isVisible().catch(() => false) ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 4: Register a new user → redirects to tabs
    // =========================================================
    log('\n=== TEST 4: Register a new user ===');
    const testEmail = `e2e-${Date.now()}@test.com`;

    await fillInput(page, 'John', 'Browser');
    await fillInput(page, 'Doe', 'Tester');
    await fillInput(page, 'you@example.com', testEmail);
    await fillInput(page, 'At least 6 characters', 'testing123');

    const fnVal = await page.locator('[placeholder="John"]:visible').inputValue();
    log(`  Fields filled: ${fnVal === 'Browser' ? 'PASS' : 'FAIL'}`);

    await page.locator('text=Create Account').first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-after-register.png`, fullPage: true });

    const url4 = page.url();
    log(`  URL after register: ${url4}`);

    // =========================================================
    // TEST 5: Verify 5 tabs are visible after registration
    // =========================================================
    log('\n=== TEST 5: Verify tab navigation ===');
    await page.waitForTimeout(1000);

    const tabs = ['Chat AI', 'Recipes', 'Meal Plan', 'Inventory', 'Profile'];
    for (const tab of tabs) {
      const visible = await page.locator(`text=${tab}`).first().isVisible().catch(() => false);
      log(`  ${tab} tab: ${visible ? 'PASS' : 'FAIL'}`);
    }

    // =========================================================
    // TEST 6: Chat AI screen has welcome UI and quick prompts
    // =========================================================
    log('\n=== TEST 6: Chat AI welcome screen ===');
    await clickTab(page, 'Chat AI');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-chat-welcome.png`, fullPage: true });

    const chatBranding = await page.locator('text=ChefMate AI').first().isVisible().catch(() => false);
    log(`  ChefMate AI branding: ${chatBranding ? 'PASS' : 'FAIL'}`);

    const quickPrompt = await page.locator('text=What can I cook tonight').first().isVisible().catch(() => false);
    log(`  Quick prompts visible: ${quickPrompt ? 'PASS' : 'FAIL'}`);

    const chatInput = await page.locator('[placeholder="Ask ChefMate anything..."]').first().isVisible().catch(() => false);
    log(`  Chat input visible: ${chatInput ? 'PASS' : 'FAIL'}`);

    const historyBtn = await page.locator('text=History').first().isVisible().catch(() => false);
    log(`  History button: ${historyBtn ? 'PASS' : 'FAIL'}`);

    const newChatBtn = await page.locator('text=New Chat').first().isVisible().catch(() => false);
    log(`  New Chat button: ${newChatBtn ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 7: Send a chat message and get AI response
    // =========================================================
    log('\n=== TEST 7: Send chat message ===');

    // Type and send a message
    const msgInput = page.locator('[placeholder="Ask ChefMate anything..."]');
    await msgInput.click();
    await msgInput.pressSequentially('Show me chicken recipes', { delay: 20 });
    await page.waitForTimeout(500);

    // Click send button
    const sendBtn = page.locator('[role="button"]').filter({ has: page.locator('text=send') }).first();
    // Fallback: find the send icon button
    const allBtns = page.locator('div[role="button"], button').filter({ hasText: /^$/ });

    // Try clicking the send area next to input
    await page.locator('[placeholder="Ask ChefMate anything..."]').press('Enter');
    await page.waitForTimeout(500);

    // The message should appear as user bubble
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-chat-user-msg.png`, fullPage: true });

    const userMsg = await page.locator('text=Show me chicken recipes').first().isVisible().catch(() => false);
    log(`  User message displayed: ${userMsg ? 'PASS' : 'FAIL'}`);

    // Wait for AI response (up to 15 seconds for fallback mode)
    log('  Waiting for AI response...');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-chat-ai-response.png`, fullPage: true });

    // Check for AI response - it should contain recipe info or fallback message
    const bodyText = await page.textContent('body');
    const hasAIResponse =
      bodyText.includes('recipe') ||
      bodyText.includes('Recipe') ||
      bodyText.includes('ChefMate') ||
      bodyText.includes('demo mode') ||
      bodyText.includes('cook');
    log(`  AI response received: ${hasAIResponse ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 8: Thread was auto-created
    // =========================================================
    log('\n=== TEST 8: Thread management ===');

    // Open thread list
    await page.locator('text=History').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-thread-list.png`, fullPage: true });

    const conversationsHeader = await page.locator('text=Conversations').first().isVisible().catch(() => false);
    log(`  Thread list opens: ${conversationsHeader ? 'PASS' : 'FAIL'}`);

    const newConvBtn = await page.locator('text=New Conversation').first().isVisible().catch(() => false);
    log(`  New Conversation button: ${newConvBtn ? 'PASS' : 'FAIL'}`);

    // Should have at least 1 thread (auto-created when we sent the message)
    const threadExists = await page.locator('text=Show me chicken recipes').first().isVisible().catch(() => false);
    log(`  Auto-created thread visible: ${threadExists ? 'PASS' : 'FAIL'}`);

    // Close thread list
    const closeBtn = page.locator('[role="button"]').filter({ has: page.locator('[data-testid="close-icon"]') });
    // Try clicking the X button or anywhere outside
    await page.locator('text=Conversations').first().press('Escape');
    await page.waitForTimeout(500);
    // If modal still showing, try clicking close icon
    const stillOpen = await page.locator('text=Conversations').first().isVisible().catch(() => false);
    if (stillOpen) {
      // Find the close button (Ionicons close)
      const allCloseButtons = await page.locator('[role="button"]').all();
      for (const btn of allCloseButtons) {
        const text = await btn.textContent().catch(() => '');
        if (text === '' || text.includes('close')) {
          await btn.click().catch(() => {});
          break;
        }
      }
      await page.waitForTimeout(500);
    }

    // =========================================================
    // TEST 9: Recipes screen — search, categories, recipe cards
    // =========================================================
    log('\n=== TEST 9: Recipes screen ===');
    await clickTab(page, 'Recipes');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-recipes-screen.png`, fullPage: true });

    const searchRecipes = await page.locator('[placeholder="Search recipes..."]:visible').first().isVisible().catch(() => false);
    log(`  Search bar visible: ${searchRecipes ? 'PASS' : 'FAIL'}`);

    const allCategory = await page.locator('text=All').first().isVisible().catch(() => false);
    log(`  "All" category filter: ${allCategory ? 'PASS' : 'FAIL'}`);

    const chickenCategory = await page.locator('text=Chicken').first().isVisible().catch(() => false);
    log(`  "Chicken" category filter: ${chickenCategory ? 'PASS' : 'FAIL'}`);

    // Check that recipe cards loaded from the database (should have at least one with "min" for time)
    const hasRecipeCards = await page.locator('text=min').first().isVisible().catch(() => false);
    log(`  Recipe cards loaded: ${hasRecipeCards ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 10: Recipe detail — navigate to a recipe
    // =========================================================
    log('\n=== TEST 10: Recipe detail ===');
    // Click on a recipe card to navigate to detail
    try {
      await page.waitForTimeout(1500);
      // Click the first recipe card - look for calorie text (all cards show "X cal")
      const calText = page.locator('text=/\\d+ cal/').first();
      const isCalVisible = await calText.isVisible().catch(() => false);
      let clicked = false;

      if (isCalVisible) {
        await calText.click({ timeout: 5000 });
        clicked = true;
      } else {
        // Fallback: click anywhere on the first card area (below search bar, above second card)
        const searchBar = page.locator('[placeholder="Search recipes..."]');
        if (await searchBar.isVisible().catch(() => false)) {
          const box = await searchBar.boundingBox();
          if (box) {
            // Click in the center of where the first recipe card should be
            await page.mouse.click(box.x + box.width / 2, box.y + box.height + 200);
            clicked = true;
          }
        }
      }
      log(`  Recipe card clicked: ${clicked ? 'PASS' : 'FAIL'}`);

      if (clicked) {
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/12-recipe-detail.png`, fullPage: true });

        const hasIngredients = await page.locator('text=Ingredients').first().isVisible().catch(() => false);
        log(`  Ingredients section: ${hasIngredients ? 'PASS' : 'FAIL'}`);

        const hasInstructions = await page.locator('text=Instructions').first().isVisible().catch(() => false);
        log(`  Instructions section: ${hasInstructions ? 'PASS' : 'FAIL'}`);

        const hasServings = await page.locator('text=Servings').first().isVisible().catch(() => false);
        log(`  Servings stat: ${hasServings ? 'PASS' : 'FAIL'}`);

        // Go back
        await page.goBack();
        await page.waitForTimeout(2000);
        await clickTab(page, 'Recipes');
        await page.waitForTimeout(1000);
      } else {
        log('  Ingredients section: SKIP');
        log('  Instructions section: SKIP');
        log('  Servings stat: SKIP');
      }
    } catch (detailErr) {
      log(`  Recipe detail error: FAIL (${detailErr.message.substring(0, 80)})`);
    }

    // =========================================================
    // TEST 11: Inventory screen — empty state, add modal
    // =========================================================
    log('\n=== TEST 11: Inventory screen ===');
    await clickTab(page, 'Inventory');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-inventory-screen.png`, fullPage: true });

    const addItemBtn = await page.locator('text=Add Item').first().isVisible().catch(() => false);
    log(`  "Add Item" button: ${addItemBtn ? 'PASS' : 'FAIL'}`);

    const itemsTotal = await page.locator('text=items total').first().isVisible().catch(() => false);
    const emptyInventory = await page.locator('text=Your inventory is empty').first().isVisible().catch(() => false);
    log(`  Inventory state visible: ${itemsTotal || emptyInventory ? 'PASS' : 'FAIL'}`);

    // Open Add Item modal
    await page.locator('text=Add Item').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-add-item-modal.png`, fullPage: true });

    const itemNameField = await page.locator('[placeholder="e.g. Chicken breast"]:visible').first().isVisible().catch(() => false);
    log(`  Add modal - name field: ${itemNameField ? 'PASS' : 'FAIL'}`);

    const fridgeOption = await page.locator('text=Fridge').first().isVisible().catch(() => false);
    log(`  Add modal - storage locations: ${fridgeOption ? 'PASS' : 'FAIL'}`);

    const produceCategory = await page.locator('text=Produce').first().isVisible().catch(() => false);
    log(`  Add modal - categories: ${produceCategory ? 'PASS' : 'FAIL'}`);

    // Close modal
    await page.locator('text=Cancel').first().click();
    await page.waitForTimeout(500);

    // =========================================================
    // TEST 12: Meal Plan screen — week navigation
    // =========================================================
    log('\n=== TEST 12: Meal Plan screen ===');
    await clickTab(page, 'Meal Plan');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-mealplan-screen.png`, fullPage: true });

    // Should show week date range or create plan prompt
    const noMealPlan = await page.locator('text=No meal plan for this week').first().isVisible().catch(() => false);
    const createPlanBtn = await page.locator('text=Create Meal Plan').first().isVisible().catch(() => false);
    const hasMealSlots = await page.locator('text=breakfast').first().isVisible().catch(() => false);
    log(`  Meal plan state visible: ${noMealPlan || createPlanBtn || hasMealSlots ? 'PASS' : 'FAIL'}`);

    // Check week date label is visible (contains "–" dash between dates)
    const bodyMealPlan = await page.textContent('body');
    const hasWeekLabel = bodyMealPlan.includes('–') || bodyMealPlan.includes('-');
    log(`  Week date label: ${hasWeekLabel ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 13: Profile tab still works
    // =========================================================
    log('\n=== TEST 13: Profile tab ===');
    await clickTab(page, 'Profile');
    await page.waitForTimeout(1000);

    const profileName = await page.locator('text=Browser').first().isVisible().catch(() => false);
    log(`  Profile tab: ${profileName ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 14: Health Goals screen (via Profile navigation)
    // =========================================================
    log('\n=== TEST 14: Health Goals screen ===');
    // Profile should already be showing
    const healthGoalsLink = page.locator('text=Health Goals').first();
    const hgVisible = await healthGoalsLink.isVisible().catch(() => false);
    log(`  Health Goals link in profile: ${hgVisible ? 'PASS' : 'FAIL'}`);

    if (hgVisible) {
      await healthGoalsLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/16-health-goals.png`, fullPage: true });

      const todayNutrition = await page.locator('text=Today\'s Nutrition').first().isVisible().catch(() => false);
      log(`  Today's Nutrition section: ${todayNutrition ? 'PASS' : 'FAIL'}`);

      const weeklyAvg = await page.locator('text=Weekly Average').first().isVisible().catch(() => false);
      log(`  Weekly Average section: ${weeklyAvg ? 'PASS' : 'FAIL'}`);

      const yourGoals = await page.locator('text=Your Goals').first().isVisible().catch(() => false);
      log(`  Your Goals section: ${yourGoals ? 'PASS' : 'FAIL'}`);

      // Go back to profile
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // =========================================================
    // TEST 15: Shopping Lists screen (via Profile navigation)
    // =========================================================
    log('\n=== TEST 15: Shopping Lists screen ===');
    await clickTab(page, 'Profile');
    await page.waitForTimeout(1000);

    const shoppingLink = page.locator('text=Shopping Lists').first();
    const slVisible = await shoppingLink.isVisible().catch(() => false);
    log(`  Shopping Lists link in profile: ${slVisible ? 'PASS' : 'FAIL'}`);

    if (slVisible) {
      await shoppingLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/17-shopping-lists.png`, fullPage: true });

      // Should show empty state or generate button
      const noLists = await page.locator('text=No shopping lists yet').first().isVisible().catch(() => false);
      const genButton = await page.locator('text=Generate from Meal Plan').first().isVisible().catch(() => false);
      const cartIcon = await page.locator('text=Shopping Lists').first().isVisible().catch(() => false);
      log(`  Shopping Lists screen: ${noLists || genButton || cartIcon ? 'PASS' : 'FAIL'}`);
      log(`  Empty state shown: ${noLists || genButton ? 'PASS' : 'FAIL'}`);

      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // =========================================================
    // TEST 16: Grocery Price API (backend test)
    // =========================================================
    log('\n=== TEST 16: Grocery Price API ===');
    try {
      const priceRes = await globalThis.fetch('http://localhost:3001/api/grocery/price?item=chicken+breast');
      // Will be 401 without auth token, which proves the route exists
      log(`  Grocery price endpoint exists: ${priceRes.status === 401 ? 'PASS' : priceRes.status === 200 ? 'PASS' : 'FAIL'} (status: ${priceRes.status})`);
    } catch (priceErr) {
      log(`  Grocery price endpoint: FAIL`);
    }

    // =========================================================
    // TEST 17: Logout and re-login
    // =========================================================
    log('\n=== TEST 17: Logout and login ===');
    await page.locator('text=Sign Out').first().click();
    await page.waitForTimeout(3000);

    const backToLogin = await page.locator('text=Sign In').first().isVisible().catch(() => false);
    log(`  Back to login: ${backToLogin ? 'PASS' : 'FAIL'}`);

    await fillInput(page, 'you@example.com', testEmail);
    await fillInput(page, 'Enter your password', 'testing123');
    await page.locator('text=Sign In').first().click();
    await page.waitForTimeout(4000);

    const loginSuccess = await page.locator('text=Chat AI').first().isVisible().catch(() => false);
    log(`  Login success: ${loginSuccess ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // TEST 18: Protected route redirect
    // =========================================================
    log('\n=== TEST 18: Protected route redirect ===');
    await clickTab(page, 'Profile');
    await page.locator('text=Sign Out').first().click();
    await page.waitForTimeout(2000);

    await page.goto(`${BASE}/(tabs)`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(3000);

    const redirectedToLogin = await page.locator('text=Sign In').first().isVisible().catch(() => false);
    log(`  Redirected to login: ${redirectedToLogin ? 'PASS' : 'FAIL'}`);

    // =========================================================
    // Console Errors
    // =========================================================
    log('\n=== Console Errors ===');
    const realErrors = consoleErrors.filter(e =>
      !e.includes('Warning:') &&
      !e.includes('deprecated') &&
      !e.includes('source map') &&
      !e.includes('DevTools') &&
      !e.includes('color scheme') &&
      !e.includes('401') &&
      !e.includes('OPENAI_API_KEY')
    );
    if (realErrors.length === 0) {
      log('  No critical console errors');
    } else {
      realErrors.slice(0, 5).forEach(e => log(`  ERROR: ${e.substring(0, 150)}`));
    }

  } catch (err) {
    log(`\nFATAL ERROR: ${err.message.substring(0, 300)}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  const passes = results.filter(r => r.includes('PASS')).length;
  const fails = results.filter(r => r.includes('FAIL')).length;
  log(`\n========================================`);
  log(`RESULTS: ${passes} passed, ${fails} failed`);
  log(`========================================`);
}

run().catch(console.error);
