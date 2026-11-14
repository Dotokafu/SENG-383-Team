const { test, expect } = require('@playwright/test');

const PASSWORD = 'Password123!';
const PARENT = 'parent1@example.com'; // parent of Deniz
const CHILD = 'child1@example.com'; // Deniz

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
}

test('Login -> Assign Task -> Mark Done', async ({ page }) => {
  // A new title for every run, so the test never depends on the data of an earlier run.
  const title = `E2E task ${Date.now()}`;

  await test.step('the parent logs in and assigns a task to the child', async () => {
    await login(page, PARENT);
    await expect(page.getByRole('heading', { name: 'Parent dashboard' })).toBeVisible();

    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Description').fill('Created by the E2E test');
    await page.getByLabel('Development area').selectOption('motor');
    await page.getByLabel('Due date').fill('2030-01-15');
    await page.getByRole('button', { name: 'Assign task' }).click();

    await expect(page.getByRole('status')).toHaveText('Task assigned.');
    const row = page.getByTestId('task-row').filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Open');
  });

  await test.step('the child sees the task and marks it as done with one click', async () => {
    await logout(page);
    await login(page, CHILD);
    await expect(page.getByRole('heading', { name: 'My tasks' })).toBeVisible();

    const todoRow = page.getByTestId('todo-row').filter({ hasText: title });
    await expect(todoRow).toHaveCount(1);
    await page.getByRole('button', { name: `Mark as done: ${title}` }).click();

    await expect(todoRow).toHaveCount(0);
    await expect(page.getByTestId('done-row').filter({ hasText: title })).toHaveCount(1);

    // The change is saved on the server, not only shown on the screen.
    await page.reload();
    await expect(page.getByTestId('done-row').filter({ hasText: title })).toHaveCount(1);
    await expect(page.getByTestId('todo-row').filter({ hasText: title })).toHaveCount(0);
  });

  await test.step('the parent sees the task as done', async () => {
    await logout(page);
    await login(page, PARENT);
    const row = page.getByTestId('task-row').filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Done');
  });
});
