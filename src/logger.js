import bunyan from 'bunyan'
import LogglyStream from 'bunyan-loggly'
import expressBunyanLogger from 'express-bunyan-logger'
import interceptor from 'rest/interceptor'

class BrowserConsoleStream {
  constructor() { 
    this.innerStream = new bunyan.ConsoleFormattedStream()
  }
  
  write(rec) {
    const { level, levelName, msg, name, src, time, v, ...properties } = rec
    
    return this.innerStream.write({
      level, levelName, msg, name, src, time, v,
      obj: { ...properties }
    })
  }
} 

const config = {
  name: 'st-web-switches',
  level: process.env.LOG_LEVEL || 'info',
  src: true
}

const getLogLevelForStatusCode = (statusCode) => {
  return (
    statusCode >= 500 ? 'error' :
    statusCode >= 400 ? 'warn' :
    'debug'
  )
}

config.streams = []

if(process.env.WEBPACK) {
  config.streams.push({ stream: new BrowserConsoleStream() })
} else {
  config.streams.push({ stream: process.stdout, level: 'info' })
}

if(process.env.LOGGLY_TOKEN) {
  config.streams.push({
    stream: new LogglyStream({ token: process.env.LOGGLY_TOKEN, subdomain: process.env.LOGGLY_SUBDOMAIN }),
    level: 'debug',
    type: 'raw'
  })
}

const logger = bunyan.createLogger(config)
export default logger

export const restLoggerInterceptor = interceptor({
  response: (response) => {
    const level = getLogLevelForStatusCode(response.status.code)
    logger[level]({
      request: response.request,
      response: {
        status: response.status,
        entity: response.entity,
        headers: response.headers
      }
    }, 'Completed request to proxied API.')
    return response
  }
})

export const expressLogger = () => {
  const options = {
    ...config,
    levelFn: getLogLevelForStatusCode,
    includesFn: (req) => {
      return { user: req.user }
    }
  }
  
  return [
    expressBunyanLogger(options),
    expressBunyanLogger.errorLogger(options)
  ]
}
