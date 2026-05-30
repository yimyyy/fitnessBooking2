describe('Classes page', () => {
  beforeEach(() => {
    cy.fixture('classes').as('classes');
  });

  it('shows upcoming classes with title, instructor, and price', () => {
    cy.intercept('GET', '/api/v1/classes?view=upcoming', { fixture: 'classes' }).as('getClasses');

    cy.visit('/classes');
    cy.wait('@getClasses');

    cy.contains('Morning Yoga').should('be.visible');
    cy.contains('Jane Smith').should('be.visible');
    cy.contains('$20').should('be.visible');
  });

  it('shows past classes when Past Classes tab is clicked', () => {
    cy.intercept('GET', '/api/v1/classes?view=upcoming', { classes: [] });
    cy.intercept('GET', '/api/v1/classes?view=past', { fixture: 'classes' }).as('getPast');

    cy.visit('/classes');
    cy.contains(/past classes/i).click();

    cy.wait('@getPast');
    cy.contains('Morning Yoga').should('be.visible');
  });

  it('shows Book Now button for authenticated student', () => {
    cy.intercept('GET', '/api/v1/classes?view=upcoming', { fixture: 'classes' });

    cy.loginAs('student', '/classes');
    cy.contains(/book now/i).should('be.visible');
  });

  it('does not show Book Now for unauthenticated users', () => {
    cy.intercept('GET', '/api/v1/classes?view=upcoming', { fixture: 'classes' });

    cy.visit('/classes');
    cy.contains(/book now/i).should('not.exist');
  });

  it('books a class and updates UI to Cancel Booking', () => {
    cy.intercept('GET', '/api/v1/classes?view=upcoming', { fixture: 'classes' });
    cy.intercept('POST', '/api/v1/bookings', {
      statusCode: 201,
      body: { booking: { id: 'b-new', status: 'confirmed' } },
    }).as('book');

    cy.loginAs('student', '/classes');
    cy.contains(/book now/i).first().click();

    cy.wait('@book');
    cy.contains(/cancel booking/i).should('be.visible');
  });

  it('shows Join Waitlist when class is full', () => {
    cy.intercept('GET', '/api/v1/classes?view=upcoming', {
      classes: [
        {
          id: 'class-full',
          title: 'Full Class',
          instructorId: 'instr-1',
          instructor: { id: 'instr-1', name: 'Jane Smith', email: 'instructor@fitness.com' },
          startTime: '2026-12-01T10:00:00.000Z',
          endTime: '2026-12-01T11:00:00.000Z',
          capacity: 5,
          price: 15,
          location: 'Room B',
          status: 'full',
          _count: { bookings: 5 },
        },
      ],
    });

    cy.loginAs('student', '/classes');
    cy.contains(/join waitlist/i).should('be.visible');
  });
});
