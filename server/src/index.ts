import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type, Static } from '@sinclair/typebox';
import { chromium } from 'playwright';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

fastify.register(cors, {
  origin: true,
});

// Define Schemas
const CookieSchema = Type.Object({
  name: Type.String(),
  value: Type.String(),
  domain: Type.String(),
  path: Type.String(),
  expires: Type.Optional(Type.Number()),
  httpOnly: Type.Optional(Type.Boolean()),
  secure: Type.Optional(Type.Boolean()),
  sameSite: Type.Optional(
    Type.Union([Type.Literal('Strict'), Type.Literal('Lax'), Type.Literal('None')])
  ),
});

const StorageSchema = Type.Record(Type.String(), Type.String());

const ScreenshotRequestSchema = Type.Object({
  url: Type.String({ format: 'uri' }),
  cookies: Type.Optional(Type.Array(CookieSchema)),
  localStorage: Type.Optional(StorageSchema),
  sessionStorage: Type.Optional(StorageSchema),
});

type ScreenshotRequestBody = Static<typeof ScreenshotRequestSchema>;

fastify.post<{ Body: ScreenshotRequestBody }>(
  '/screenshot',
  {
    schema: {
      body: ScreenshotRequestSchema,
      response: {
        200: Type.Any(),
      },
    },
  },
  async (request, reply) => {
    const { url, cookies, localStorage, sessionStorage } = request.body;

    let browser;
    try {
      browser = await chromium.launch();

      const context = await browser.newContext();

      // Set cookies if provided
      if (cookies) {
        await context.addCookies(cookies);
      }

      const page = await context.newPage();

      // Set localStorage and sessionStorage
      if (localStorage || sessionStorage) {
        await page.goto('about:blank');

        const storageData = {
          local: localStorage || {},
          session: sessionStorage || {},
        };

        await page.addInitScript(
          (storageData: {
            local: Record<string, string>;
            session: Record<string, string>;
          }) => {
            const { local, session } = storageData;
            // Use window.localStorage and window.sessionStorage
            if (local && Object.keys(local).length > 0) {
              for (const [key, value] of Object.entries(local)) {
                window.localStorage.setItem(key, value);
              }
            }
            if (session && Object.keys(session).length > 0) {
              for (const [key, value] of Object.entries(session)) {
                window.sessionStorage.setItem(key, value);
              }
            }
          },
          storageData
        );
      }

      // Navigate to the target URL
      await page.goto(url, { waitUntil: 'domcontentloaded',        
        timeout: 30000, // Increase timeout to 60 seconds
      });

      console.log('DOMContentLoaded event fired');

      // Wait a short additional time for any scripts to run
      await page.waitForTimeout(5000);
      
      console.log('Taking screenshot');

      // Take a full-page screenshot
      const screenshotBuffer = await page.screenshot({ fullPage: true,
        timeout: 60000, // Increase screenshot timeout to 60 seconds
       });

      await browser.close();

      // Send the screenshot back
      reply.type('image/png').send(screenshotBuffer);
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error(error);
      reply.status(500).send({ error: 'Failed to take screenshot' });
    }
  }
);

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server running at ${address}`);
});
