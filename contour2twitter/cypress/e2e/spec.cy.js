it('scrapeAndUpdateTwitterBanner', () => {
 cy.visit('https://glucocontro.online')

 cy.get('#email').type(Cypress.env('contourEmail'))
 cy.get('#password').type(Cypress.env('contourPassword'))
 cy.get('button[type="submit"]').click()

 cy.wait(40000)

 cy.contains('Generate report').click()
 cy.get('button').contains('Patient\'s BG data').parent().click({ force: true })

 cy.wait(5000)

 cy.task('updateTwitterBanner')
})
