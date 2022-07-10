it('scrapeAndUpdateTwitterBanner', () => {
 cy.visit('https://glucocontro.online')

 cy.get('#email').type(Cypress.env('contourEmail'))
 cy.get('#password').type(Cypress.env('contourPassword'))
 cy.get('button[type="submit"]').click()

 cy.wait(20000)

 cy.get('button').contains('Generate report').parentsUntil('button').click()
 cy.get('button').contains('Patient\'s BG data').parent().click()

 cy.wait(5000)

 cy.task('updateTwitterBanner')
})
