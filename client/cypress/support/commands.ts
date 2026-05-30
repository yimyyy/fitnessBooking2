/// <reference types="cypress" />

const USERS = {
  admin: {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@fitness.com',
    role: 'admin',
    language: 'en',
  },
  student: {
    id: 'student-1',
    name: 'Test Student',
    email: 'student@fitness.com',
    role: 'student',
    language: 'en',
  },
} as const;

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Log in as a given role by seeding localStorage before page load.
       * @param role  'admin' | 'student'
       * @param path  Route to visit after setting auth state (default '/')
       */
      loginAs(role: keyof typeof USERS, path?: string): Chainable<void>;

      /**
       * Fill a React-controlled datetime-local input.
       * Plain .type() is unreliable for datetime-local; this sets the native value
       * and dispatches the events React needs.
       */
      fillDatetimeLocal(selector: string, value: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (role, path = '/') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('user', JSON.stringify(USERS[role]));
    },
  });
});

Cypress.Commands.add('fillDatetimeLocal', (selector, value) => {
  cy.get(selector).then($el => {
    const input = $el[0] as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
});
