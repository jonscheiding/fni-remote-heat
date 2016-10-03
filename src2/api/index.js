import express from 'express'
import bodyParser from 'body-parser'
import parseUrl from 'parseurl'

import client from './smartapp-client'

const api = express.Router()

api.use(bodyParser.json())

api.use((req, res) => {
  const url = parseUrl(req)

  const serverRequest = {
    method: req.method,
    path: url.path,
    headers: {}
  }
  
  if(req.method != 'GET' && req.body) {
    serverRequest.entity = req.body
  }
  
  if(req.get('Content-Type')) {
    serverRequest.headers['Content-Type'] = req.get('Content-Type')
  }  

  client(serverRequest).then(serverResponse => {
    res.status(serverResponse.status.code)
    res.set('Content-Type', serverResponse.headers['Content-Type'])
    res.send(serverResponse.entity)
  })
  .catch(err => res.status(500).send(err.toString()))
})

export default api