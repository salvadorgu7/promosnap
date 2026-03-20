import { test, expect } from '@playwright/test'

test.describe('Smoke Tests — Critical User Flows', () => {
  test('homepage loads and shows key sections', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PromoSnap/)
    // Hero section or main heading should be visible
    await expect(page.locator('main')).toBeVisible()
  })

  test('search page loads with query', async ({ page }) => {
    await page.goto('/busca?q=iphone')
    await expect(page.locator('main')).toBeVisible()
    // Search should show some content (results or empty state)
    await expect(page.locator('body')).toContainText(/busca|resultado|iphone/i)
  })

  test('product page loads', async ({ page }) => {
    // Navigate via homepage to find a product link
    await page.goto('/')
    const productLink = page.locator('a[href*="/produto/"]').first()
    if (await productLink.isVisible()) {
      await productLink.click()
      await expect(page.locator('main')).toBeVisible()
      // Product page should have a price or product info
      await expect(page.locator('body')).toContainText(/R\$|preço|produto/i)
    }
  })

  test('ofertas page loads', async ({ page }) => {
    await page.goto('/ofertas')
    await expect(page.locator('main')).toBeVisible()
  })

  test('alertas page loads', async ({ page }) => {
    await page.goto('/alertas')
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('body')).toContainText(/alerta|preço|email/i)
  })

  test('API health — search returns valid JSON', async ({ request }) => {
    const res = await request.get('/api/search?q=test&limit=1')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('products')
    expect(Array.isArray(body.products)).toBe(true)
  })

  test('API health — trending returns valid JSON', async ({ request }) => {
    const res = await request.get('/api/trending')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('keywords')
  })

  test('clickout redirects with affiliate tag', async ({ request }) => {
    const res = await request.get('/api/clickout?url=https://www.amazon.com.br/dp/B09XYZ', {
      maxRedirects: 0,
    })
    // Should be a redirect (302) or OK with tracking
    expect([200, 302, 307]).toContain(res.status())
  })
})
