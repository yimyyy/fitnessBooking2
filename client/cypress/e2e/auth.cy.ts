describe('Authentication', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/classes*', { classes: [] });
  });

  describe('Login', () => {
    it('logs in with valid credentials and redirects to home', () => {
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          token: 'test-jwt-token',
          user: { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'student', language: 'en' },
        },
      }).as('login');

      cy.visit('/login');
      cy.get('input[type="email"]').type('alice@test.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@login');
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
      cy.window().its('localStorage').invoke('getItem', 'token').should('eq', 'test-jwt-token');
    });

    it('shows an error for invalid credentials', () => {
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 401,
        body: { message: 'Invalid email or password' },
      }).as('login');

      cy.visit('/login');
      cy.get('input[type="email"]').type('wrong@test.com');
      cy.get('input[type="password"]').type('badpassword');
      cy.get('button[type="submit"]').click();

      cy.wait('@login');
      cy.url().should('include', '/login');
      cy.contains('Invalid email or password').should('be.visible');
    });
  });

  describe('Register', () => {
    it('creates an account and redirects to home', () => {
      cy.intercept('POST', '/api/v1/auth/register', {
        statusCode: 201,
        body: {
          token: 'test-jwt-token',
          user: { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'student', language: 'en' },
        },
      }).as('register');

      cy.visit('/register');
      cy.get('input[name="name"], input[placeholder*="name" i], input[placeholder*="Name"]').first().type('Bob');
      cy.get('input[type="email"]').type('bob@test.com');
      cy.get('input[type="password"]').type('securepass');
      cy.get('button[type="submit"]').click();

      cy.wait('@register');
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
    });

    it('shows error when email is already in use', () => {
      cy.intercept('POST', '/api/v1/auth/register', {
        statusCode: 409,
        body: { message: 'Email already in use' },
      }).as('register');

      cy.visit('/register');
      cy.get('input[type="email"]').type('existing@test.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@register');
      cy.contains('Email already in use').should('be.visible');
    });
  });

  describe('Protected routes', () => {
    it('redirects unauthenticated user away from /bookings', () => {
      cy.visit('/bookings');
      cy.url().should('include', '/login');
    });

    it('redirects non-admin away from /admin', () => {
      cy.loginAs('student', '/admin');
      cy.url().should('not.include', '/admin');
    });
  });
});
