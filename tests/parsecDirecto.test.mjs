import test from 'node:test';
import assert from 'node:assert/strict';
import { parsecDirecto } from '../src/js/core/dom.js';

test('invitación web de Parsec → enlace directo', () => {
  assert.equal(parsecDirecto('https://dash.parsec.app/join-computer/?peer=3IKhY9bozbb2xi6t1NDy0rFU3ZA&secret=smiznvrf'), 'parsec://peer_id=3IKhY9bozbb2xi6t1NDy0rFU3ZA&secret=smiznvrf');
  assert.equal(parsecDirecto('https://dash.parsec.app/join-computer?peer=3IKhY9bozbb2xi6t1NDy0rFU3ZA'), 'parsec://peer_id=3IKhY9bozbb2xi6t1NDy0rFU3ZA');
});
test('lo que no es invitación de Parsec devuelve vacío', () => {
  for (const x of ['', null, 'parsec://peer_id=abc', 'https://evil.com/join-computer?peer=3IKhY9bozbb2xi6t1NDy0rFU3ZA', 'https://dash.parsec.app/otra?peer=3IKhY9bozbb2xi6t1NDy0rFU3ZA', 'https://dash.parsec.app/join-computer?peer=a%26b', 'http://dash.parsec.app/join-computer?peer=3IKhY9bozbb2xi6t1NDy0rFU3ZA']) assert.equal(parsecDirecto(x), '');
});
