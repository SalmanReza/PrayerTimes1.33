import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSections, SECTION_KEYS } from '../src/sections.js';
import { readText } from './helpers/read-text.js';

const html = readText('../index.html', import.meta.url);
const app = readText('../src/app.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);

test('sections: all shown by default; only real booleans override; junk falls back to shown', () => {
  assert.deepEqual(SECTION_KEYS, ['descriptions', 'sunnah', 'onThisDay']);
  assert.deepEqual(sanitizeSections(undefined), { descriptions: true, sunnah: true, onThisDay: true });
  assert.deepEqual(sanitizeSections(null), { descriptions: true, sunnah: true, onThisDay: true });
  assert.deepEqual(sanitizeSections({ sunnah: false }), { descriptions: true, sunnah: false, onThisDay: true });
  assert.deepEqual(sanitizeSections({ descriptions: 'no', sunnah: 0, onThisDay: false, extra: 1 }), { descriptions: true, sunnah: true, onThisDay: false });
  const saved = JSON.parse(JSON.stringify({ sections: sanitizeSections({ onThisDay: false }) }));
  assert.deepEqual(sanitizeSections(saved.sections), { descriptions: true, sunnah: true, onThisDay: false }, 'round-trips through persistence');
});

test('settings toggles exist, are persisted and drive visibility; hidden sections are not rendered', () => {
  for (const id of ['showDescriptionsToggle', 'showSunnahToggle', 'showOnThisDayToggle']) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.ok(html.indexOf(`id="${id}"`) > html.indexOf('<main id="settingsView"'), `${id} lives in Settings`);
  }
  assert.match(app, /sections: \{ descriptions: true, sunnah: true, onThisDay: true \}/, 'default: all shown');
  assert.match(app, /sections: sanitizeSections\(saved\.sections\)/, 'persisted and validated on load');
  assert.match(app, /state\.sections\[key\] = event\.target\.checked;\n\s+save\(\);\n\s+applySectionVisibility\(\);/);
  const fn = app.slice(app.indexOf('function applySectionVisibility'), app.indexOf('function renderPrayerGuidance'));
  assert.match(fn, /el\.hidden = !on;/);
  assert.match(fn, /if \(on\) render\(\); else clear\.forEach/, 'hidden: nothing rendered, content cleared');
  for (const [id, key] of [['prayerDetails', 'descriptions'], ['sunnahSection', 'sunnah'], ['onThisDaySection', 'onThisDay']]) {
    assert.match(fn, new RegExp(`set\\('${id}', show\\.${key},`));
    assert.match(html, new RegExp(`id="${id}"`));
  }
  const render = app.slice(app.indexOf('function render() {'), app.indexOf('function forbiddenCardHtml') > 0 ? app.indexOf('/* Forbidden-time card') : undefined);
  for (const call of ['renderPrayerGuidance', 'renderHijriPrayerEvent', 'renderPropheticDay', 'renderOnThisDay', 'renderQuranRevelation']) assert.doesNotMatch(render, new RegExp(`\\b${call}\\(\\)`), `render() does not call ${call} directly`);
  assert.match(render, /applySectionVisibility\(\);/);
  assert.match(css, /\.section-block\[hidden\] \{ display: none !important; \}/);
  assert.match(app, /if \(!state\.sections\.descriptions\) \{ showToast/, 'description links explain instead of scrolling to a hidden section');
});

test('settings toggles are bilingual', () => {
  for (const text of ['Sections on the home page', 'Show Prayer descriptions', 'Show Sunnah and Seerah', 'Show On this day in Islamic history', 'Send test notification']) {
    assert.ok(html.includes(text), `${text} is in the HTML`);
    assert.ok(app.includes(`'${text}':'`), `${text} has a Bangla translation`);
  }
});

test('Prayer descriptions stay ONE section whose categories are rows stacked vertically, sized to content', () => {
  assert.equal((html.match(/id="prayerDetails"/g) || []).length, 1);
  assert.equal((html.match(/id="descriptionList"/g) || []).length, 1);
  assert.match(css, /\.description-list \{ display: flex; flex-direction: column; gap: \.75rem;/);
  assert.doesNotMatch(css, /\.description-list \{ display: grid/, 'no horizontal layout at wide widths');
  assert.doesNotMatch(css, /\.description-list details/);
  const groups = (app.match(/\{ title: '(Obligatory prayers|Daily voluntary prayers|Situational voluntary prayers)'/g) || []).length;
  assert.equal(groups, 3, 'three categories');
  assert.match(app, /<section class="description-group"><h3>\$\{heading\}<\/h3><div class="ref-grid">/, 'evidence-first reference cards are kept');
});
