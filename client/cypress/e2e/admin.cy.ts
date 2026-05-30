const INSTRUCTOR = { id: 'instr-1', name: 'Jane Smith', email: 'instructor@fitness.com', role: 'instructor', language: 'en', _count: { bookings: 0 } };
const MOCK_CLASS = {
  id: 'new-class',
  title: 'Test Yoga',
  description: '',
  instructorId: 'instr-1',
  instructor: { id: 'instr-1', name: 'Jane Smith', email: 'instructor@fitness.com' },
  startTime: '2026-12-01T10:00:00.000Z',
  endTime: '2026-12-01T11:00:00.000Z',
  capacity: 10,
  price: 20,
  location: 'Studio A',
  status: 'upcoming',
  _count: { bookings: 0 },
};

function stubAdminPage(classes = [MOCK_CLASS]) {
  cy.intercept('GET', '/api/v1/admin/stats', { totalBookings: 5, totalRevenue: 100, classCount: 2 });
  cy.intercept('GET', '/api/v1/classes*', { classes });
  cy.intercept('GET', '/api/v1/admin/users', { users: [INSTRUCTOR] });
  cy.intercept('GET', '/api/v1/admin/settings', { settings: { cancellationWindowHours: '24' } });
}

describe('Admin page', () => {
  beforeEach(() => {
    stubAdminPage();
    cy.loginAs('admin', '/admin');
  });

  it('shows dashboard stats', () => {
    cy.contains('5').should('be.visible');   // total bookings
    cy.contains('$100.00').should('be.visible');
  });

  it('shows classes table with existing class', () => {
    cy.contains('Test Yoga').should('be.visible');
    cy.contains('upcoming').should('be.visible');
  });

  describe('Create class form', () => {
    beforeEach(() => {
      cy.contains(/create class/i).click();
    });

    it('shows the form when Create Class is clicked', () => {
      cy.get('input[type="datetime-local"]').should('be.visible');
      cy.contains(/duration/i).should('be.visible');
      cy.contains(/end time/i).should('not.exist');
    });

    // ─── THE CRITICAL TEST ───────────────────────────────────────────────────
    // This is the regression test for the bug where datetime-local values
    // ("2026-12-01T10:00") were submitted as-is, failing z.string().datetime()
    // on the server. The fix appends ":00Z" to produce a valid ISO 8601 string.
    it('submits startTime and endTime as valid ISO 8601 datetime strings', () => {
      cy.intercept('POST', '/api/v1/classes', (req) => {
        const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
        expect(req.body.startTime, 'startTime must be ISO 8601 with timezone').to.match(iso8601);
        expect(req.body.endTime, 'endTime must be ISO 8601 with timezone').to.match(iso8601);
        req.reply({ statusCode: 201, body: { class: MOCK_CLASS } });
      }).as('createClass');

      cy.get('input').first().clear().type('Test Yoga');
      cy.get('select').first().select('Jane Smith');
      cy.fillDatetimeLocal('input[type="datetime-local"]', '2026-12-01T10:00');
      cy.get('input[type="number"]').eq(0).clear().type('60');  // duration
      cy.get('input[type="number"]').eq(1).clear().type('10');  // capacity
      cy.get('input[type="number"]').eq(2).clear().type('20');  // price
      cy.get('input[type="text"]').last().clear().type('Studio A'); // location

      cy.contains('Save').click();
      cy.wait('@createClass');
    });

    it('computes endTime from startTime + duration', () => {
      cy.intercept('POST', '/api/v1/classes', (req) => {
        const start = new Date(req.body.startTime).getTime();
        const end = new Date(req.body.endTime).getTime();
        const durationMins = (end - start) / 60000;
        expect(durationMins, 'endTime should be startTime + 90 minutes').to.equal(90);
        req.reply({ statusCode: 201, body: { class: MOCK_CLASS } });
      }).as('createClass');

      cy.get('input').first().clear().type('Test Yoga');
      cy.get('select').first().select('Jane Smith');
      cy.fillDatetimeLocal('input[type="datetime-local"]', '2026-12-01T10:00');
      cy.get('input[type="number"]').eq(0).clear().type('90');  // 90-minute class
      cy.get('input[type="number"]').eq(1).clear().type('10');
      cy.get('input[type="number"]').eq(2).clear().type('20');
      cy.get('input[type="text"]').last().clear().type('Studio A');

      cy.contains('Save').click();
      cy.wait('@createClass');
    });

    it('shows an error banner when the API rejects the request', () => {
      cy.intercept('POST', '/api/v1/classes', {
        statusCode: 400,
        body: { message: 'Invalid class data' },
      });

      cy.get('input').first().clear().type('Test Yoga');
      cy.get('select').first().select('Jane Smith');
      cy.fillDatetimeLocal('input[type="datetime-local"]', '2026-12-01T10:00');
      cy.get('input[type="number"]').eq(0).clear().type('60');
      cy.get('input[type="number"]').eq(1).clear().type('10');
      cy.get('input[type="number"]').eq(2).clear().type('20');
      cy.get('input[type="text"]').last().clear().type('Studio A');

      cy.contains('Save').click();
      cy.contains('Invalid class data').should('be.visible');
    });

    it('shows validation errors for empty required fields', () => {
      cy.contains('Save').click();
      cy.contains('This field is required').should('be.visible');
    });

    it('clears the error banner when the form is cancelled', () => {
      cy.intercept('POST', '/api/v1/classes', { statusCode: 400, body: { message: 'Bad request' } });

      cy.get('input').first().clear().type('Test Yoga');
      cy.get('select').first().select('Jane Smith');
      cy.fillDatetimeLocal('input[type="datetime-local"]', '2026-12-01T10:00');
      cy.get('input[type="number"]').eq(0).clear().type('60');
      cy.get('input[type="number"]').eq(1).clear().type('10');
      cy.get('input[type="number"]').eq(2).clear().type('20');
      cy.get('input[type="text"]').last().clear().type('Studio A');
      cy.contains('Save').click();
      cy.contains('Bad request').should('be.visible');

      cy.contains('Cancel').click();
      cy.contains('Bad request').should('not.exist');
    });
  });

  describe('Edit class', () => {
    it('pre-fills duration from existing class start/end times', () => {
      // MOCK_CLASS has startTime 10:00 and endTime 11:00 → 60 min
      cy.contains('Edit').first().click();
      cy.get('input[type="number"]').eq(0).should('have.value', '60');
    });
  });
});
