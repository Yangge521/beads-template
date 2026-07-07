import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'scripts',         // 一次性数据生成脚本，不参与 lint
    '**/*.cjs',        // CommonJS 脚本
    'eslint.config.js',
    'vite.config.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // 强制使用 const，禁止可被 const 替代的 let
      'prefer-const': ['warn', { destructuring: 'all', ignoreReadBeforeAssign: false }],
      // 禁止 var
      'no-var': 'error',
      // 强制 === / !==，避免隐式类型转换 Bug
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // 禁止无意义的 console（保留 error/warn，便于线上排查）
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // React Hooks 规则严格化（已有的 set-state-in-effect 等历史代码渐进迁移）
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // 允许 no-explicit-any 作为渐进迁移策略（warn 而非 error）
      '@typescript-eslint/no-explicit-any': 'warn',
      // 允许 ts-ignore 但需注释原因（已有 // @ts-expect-error）
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
])
