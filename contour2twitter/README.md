# Contour 2 Twitter

Contour readings to Twitter profile banner:

![Screenshot of my Twitter profile banner: a line graph where each pink dot is a blood glucose measurement from the Contour meter.](./twitter-profile-banner.png)

## Run

Download the CSV from from glucocontro.online, parse it, and update the Twitter profile banner:

```bash
# Install node
npm install

CONTOUR_EMAIL='...' \
CONTOUR_PASSWORD='...' \
TWITTER_APP_KEY='...' \
TWITTER_APP_SECRET='...' \
TWITTER_ACCESS_TOKEN='...' \
TWITTER_ACCESS_SECRET='...' \
npx cypress run
```
