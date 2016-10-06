import envalid from 'envalid'
import rest from 'rest'
import interceptor from 'rest/interceptor'
import mimeInterceptor from 'rest/interceptor/mime'
import pathPrefixInterceptor from 'rest/interceptor/pathPrefix'
import mapObject from 'object.map'

import restProxy from 'src/rest-proxy'
import { accessTokenInterceptor, entityRewriteInterceptor, urlRewriteInterceptor } from 'src/rest-interceptor'

envalid.validate(process.env, {
  SMARTAPP_ACCESS_TOKEN: { required: true },
  SMARTAPP_BASE_URL: { required: true }
})

const UNPLUGGED_TIME_THRESHOLD = 5000
const UNPLUGGED_USAGE_THRESHOLD = 0

const rewriteSwitchesResponse = entity => {
  if(entity instanceof Array) return entity.map(rewriteSwitchesResponse)
  if(!entity.state) return entity // Workaround for actually knowing whether we're dealing with a "switch" resource
  
  const result = {...entity}
  if(result.state.currently == 'on' && result.state.since != null && result.usage != null) {
    const timeOn = Date.now() - Date.parse(result.state.since)

    if(result.usage === UNPLUGGED_USAGE_THRESHOLD && timeOn < UNPLUGGED_TIME_THRESHOLD) {
      result.state.currently = 'turning on'
    } else {
      result.unplugged = (result.usage === UNPLUGGED_USAGE_THRESHOLD)
    }
  }
  
  return result
}

const rewriteLinksWithPrefix = (prefix) => entity => {
  if(entity instanceof Array) return entity.map(rewriteLinksWithPrefix(prefix))
  
  return {
    ...entity,
    links: mapObject(entity.links, (value) => prefix + value)
  }
}

const client = rest.wrap(mimeInterceptor)

export default () => (req, res) => {
  const [ baseUrl, accessToken ] = [ process.env.SMARTAPP_BASE_URL, process.env.SMARTAPP_ACCESS_TOKEN ]

  const proxyRequest = restProxy(client
    .wrap(pathPrefixInterceptor, {prefix: baseUrl})
    .wrap(urlRewriteInterceptor)
    .wrap(accessTokenInterceptor, {accessToken: accessToken})
    .wrap(entityRewriteInterceptor, {rewriteEntity: rewriteLinksWithPrefix(req.baseUrl)})
    .wrap(entityRewriteInterceptor, {rewriteEntity: rewriteSwitchesResponse})
  )
  
  proxyRequest(req, res)
}
