import envalid from 'envalid'
import express from 'express'
import expressSession from 'express-session'
import ensureLogin from 'connect-ensure-login'
import passport from 'passport'
import OAuth2Strategy from 'passport-oauth2'

envalid.validate(process.env, {
  SESSION_SECRET: { required: true },
  SM_OAUTH_ID: { required: true },
  SM_OAUTH_SECRET: { required: true },
  SM_API_URL: { required: true }
})

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))

passport.use('fnllc', new OAuth2Strategy({
  authorizationURL: process.env.SM_API_URL + '/oauth2/authorize',
  tokenURL: process.env.SM_API_URL + '/oauth2/token',
  clientID: process.env.SM_OAUTH_ID,
  clientSecret: process.env.SM_OAUTH_SECRET,
  callbackURL: '/login',
  scope: 'login'
},
  function(accessToken, refreshToken, profile, cb) {
    return cb(null, accessToken)
  }
))

var callback = express.Router()
callback.get('/login', passport.authenticate('fnllc', { failureRedirect: '/', successRedirect: '/' }))

export default () => [
  expressSession({
    resave: false, saveUninitialized: true, 
    secret: process.env.SESSION_SECRET, 
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
  }),
  passport.initialize(),
  passport.session(),
  callback,
  ensureLogin.ensureLoggedIn('/login')
]