// Run inside the API runtime image against the disposable integration database only.
import assert from "node:assert/strict";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import postgres from "postgres";
import { buildApp } from "./dist/app.js";
import { createSession } from "./dist/auth.js";
import { renderReportPdf, reportHtml } from "./dist/reports.js";
const databaseUrl = process.env.TEST_DATABASE_URL;
assert(databaseUrl && new URL(databaseUrl).pathname === "/zenops_test", "Disposable zenops_test database required");
const db = postgres(databaseUrl, {transform: postgres.camel});
const app = buildApp({NODE_ENV:"test", DATABASE_URL:databaseUrl, HOST:"127.0.0.1", PORT:3000, WEB_ORIGIN:"https://zenops.test", SESSION_COOKIE_NAME:"zenops_session", SESSION_TTL_HOURS:1}, db);
const directory = "/tmp/report-check";
await mkdir(directory, {recursive:true});
try {
  await app.ready();
  const [admin] = await db`select u.id from users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where r.code='ADMIN' and u.is_active limit 1`;
  assert(admin);
  const session = await createSession(db, admin.id, 1, {});
  const headers = {cookie:`zenops_session=${session.token}`};
  for (const date of ["2026-09-25", "2000-01-01"]) {
    const response = await app.inject({url:`/api/reports/daily.pdf?date=${date}`, headers});
    assert.equal(response.statusCode, 200, response.body);
    assert.match(response.headers["content-type"], /application\/pdf/);
    assert.match(response.headers["content-disposition"], new RegExp(`zenops-denni-report-${date}`));
    assert.equal(response.rawPayload.subarray(0,5).toString(), "%PDF-");
    await writeFile(`${directory}/${date}.pdf`, response.rawPayload);
  }
  const daily = await app.inject({url:"/api/reports/daily?date=2026-09-25",headers});
  const report = daily.json().report;
  assert(report.entries.length > 0);
  const stress = {...report, entries:Array.from({length:80},(_,index)=>({...report.entries[0], employeeName:`Žluťoučký pracovník ${index+1}`, projectName:'Dlouhý název zakázky <script>alert(1)</script> & česká diakritika', attachments:['PŘ-01','PŘ-02']}))};
  const html = reportHtml(stress);
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;script&gt;'));
  await writeFile(`${directory}/multipage.pdf`, await renderReportPdf(html));
  const executable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/missing-chromium';
  const failure = await app.inject({url:'/api/reports/daily.pdf?date=2026-09-25',headers});
  assert.equal(failure.statusCode,503);
  assert.match(failure.json().error,/PDF se nepodařilo/);
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = executable;
  assert.deepEqual((await readdir('/tmp')).filter(name=>name.startsWith('zenops-pdf-')),[]);
  console.log('PASS: populated PDF, empty PDF, multipage Czech PDF, escaped content, HTTP headers, handled browser failure, temporary-directory cleanup');
} finally {
  await app.close(); await db.end();
}
