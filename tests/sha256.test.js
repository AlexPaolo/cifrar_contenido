const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createApp(crypto = webcrypto) {
    const ids = [
        'metodo', 'textoOriginal', 'resultado', 'cesar-desplazamiento', 'clave-texto',
        'descifrar-button', 'cifrar-button', 'texto-label', 'resultado-label',
        'sha256-aviso', 'cesar-param', 'clave-param'
    ];
    const elements = Object.fromEntries(ids.map(id => [id, {
        value: '',
        textContent: '',
        style: {}
    }]));
    const sections = ['sha256-aviso', 'cesar-param', 'clave-param'].map(id => elements[id]);
    const document = {
        getElementById: id => elements[id],
        querySelectorAll: () => sections,
        addEventListener: () => {}
    };
    const context = vm.createContext({
        document,
        window: { crypto },
        TextEncoder,
        Uint8Array,
        Array,
        parseInt,
        isNaN,
        alert: () => {}
    });

    vm.runInContext(script, context);
    return { context, elements };
}

test('calculates the standard SHA-256 digest and presents the one-way hash flow', async () => {
    const { context, elements } = createApp();
    elements.metodo.value = 'sha256';
    elements.textoOriginal.value = 'abc';

    context.mostrarParametros();
    await context.procesarTexto(true);

    assert.equal(elements.resultado.textContent, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(elements['descifrar-button'].style.display, 'none');
    assert.equal(elements['cifrar-button'].textContent, 'Calcular hash SHA-256');
    assert.equal(elements['sha256-aviso'].style.display, 'block');
});

test('does not attempt to decrypt SHA-256', async () => {
    const { context, elements } = createApp();
    elements.metodo.value = 'sha256';
    elements.textoOriginal.value = 'abc';

    await context.procesarTexto(false);

    assert.match(elements.resultado.textContent, /no se puede descifrar/);
});

test('keeps existing Caesar encryption behavior', async () => {
    const { context, elements } = createApp();
    elements.metodo.value = 'cesar';
    elements.textoOriginal.value = 'abc';
    elements['cesar-desplazamiento'].value = '3';

    await context.procesarTexto(true);

    assert.equal(elements.resultado.textContent, 'def');
});

test('reports when Web Crypto is unavailable', async () => {
    const { context, elements } = createApp(null);
    elements.metodo.value = 'sha256';
    elements.textoOriginal.value = 'abc';

    await context.procesarTexto(true);

    assert.match(elements.resultado.textContent, /HTTPS o localhost/);
});
