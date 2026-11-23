import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config({ ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'start-server.mjs'] }, js.configs.recommended, ...tseslint.configs.recommended);
