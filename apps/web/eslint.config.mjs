import angular from 'angular-eslint';
import baseConfig from '../../eslint.config.mjs';

const HTML_FILES = ['**/*.html'];

const HOST_DECORATOR_RESTRICTIONS = [
  {
    selector: "Decorator[expression.callee.name='HostBinding']",
    message:
      'Do not use @HostBinding. Use the host object in the @Component/@Directive decorator instead (AGENTS.md).',
  },
  {
    selector: "Decorator[expression.callee.name='HostListener']",
    message:
      'Do not use @HostListener. Use the host object in the @Component/@Directive decorator instead (AGENTS.md).',
  },
];

const NO_STANDALONE_TRUE = {
  selector: "ObjectExpression > Property[key.name='standalone'][value.value=true]",
  message: 'Do not set standalone: true. Standalone is the default in Angular 20+ (AGENTS.md).',
};

const scopeToHtml = (configs) => configs.map((c) => ({ ...c, files: c.files ?? HTML_FILES }));

export default [
  ...baseConfig,
  ...angular.configs.tsRecommended,
  {
    files: ['**/*.ts'],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      'no-restricted-syntax': ['error', NO_STANDALONE_TRUE, ...HOST_DECORATOR_RESTRICTIONS],
    },
  },
  ...scopeToHtml(angular.configs.templateRecommended),
  ...scopeToHtml(angular.configs.templateAccessibility),
  {
    files: HTML_FILES,
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "BoundAttribute[name='ngClass']",
          message: 'Do not use [ngClass]. Use [class.x] or [class] bindings instead (AGENTS.md).',
        },
        {
          selector: "BoundAttribute[name='ngStyle']",
          message: 'Do not use [ngStyle]. Use [style.x] or [style] bindings instead (AGENTS.md).',
        },
        {
          selector: "TemplateAttribute[name='ngIf']",
          message: 'Do not use *ngIf. Use @if instead (AGENTS.md).',
        },
        {
          selector: "TemplateAttribute[name='ngFor']",
          message: 'Do not use *ngFor. Use @for instead (AGENTS.md).',
        },
        {
          selector: "TemplateAttribute[name='ngSwitch']",
          message: 'Do not use *ngSwitch. Use @switch instead (AGENTS.md).',
        },
      ],
    },
  },
];
