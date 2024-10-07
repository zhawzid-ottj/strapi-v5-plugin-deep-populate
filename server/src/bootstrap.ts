import pluginId from './pluginId'

import { getFullPopulateObject, validatePopulateIgnore } from '../../../strapi-v5-plugin-deep-populate2/server/src/utils/utils'
import { PluginConfig } from './config/schema'

const bootstrap = ({ strapi }) => {
    // Get the plugin config
    const {
        minDepth,
        maxDepth,
        skipCreatorFields,
        debug,
        allowedModels,
        ignoreFields,
        ignorePaths,
    }: PluginConfig = strapi.config.get('plugin::' + pluginId)

    strapi.db.lifecycles.subscribe((event) => {
        if (event.action === 'beforeFindMany' || event.action === 'beforeFindOne') {
            const ctx = strapi.requestContext.get()
            debug && console.log(ctx?.request?.query) // Debug

            let { deepPopulate } = event.params
            if (deepPopulate===undefined) {
              return
            }

            deepPopulate = deepPopulate.split(',')

            if (deepPopulate && deepPopulate[0] === 'deep') {
                const model = event.model
                // Check if the model is allowed
                if (allowedModels.length && !allowedModels.includes(model.uid)) {
                    return
                }
                const queryParams = ctx?.request?.query || {}
                const populateIgnoreFields = validatePopulateIgnore(queryParams.populateIgnore)
                const populateIgnorePaths = validatePopulateIgnore(queryParams.populateIgnorePaths)
                debug && console.log('populateIgnore', populateIgnoreFields) // Debug
    
                let depth = parseInt(deepPopulate[1], 10) || minDepth

                // Limit the depth to the default depth if it's greater than the default depth
                const limitedDepth = Math.min(depth, maxDepth)


                const ignoredFields = new Set()

                // Add the ignored fields from the config
                if (ignoreFields.length) {
                    ignoreFields.forEach((field) => ignoredFields.add(field))
                }

                // Add the ignoredFields fields from the query params
                if (populateIgnoreFields.length) {
                    populateIgnoreFields.forEach((field) => ignoredFields.add(field))
                }

                const ignoredPaths = new Set()

                // Add the ignored paths from the config
                if (ignorePaths.length) {
                    ignorePaths.forEach((path) => ignoredPaths.add(path))
                }

                // Add the ignoredPaths paths from the query params
                if (populateIgnorePaths.length) {
                    populateIgnorePaths.forEach((path) => ignoredPaths.add(path))
                }

                // Debug
                debug &&
                    console.log(
                        'Request Settings:',
                        'Model:',
                        model.uid,
                        'Depth:',
                        limitedDepth,
                        'Skip Creator Fields:',
                        skipCreatorFields,
                        'Ignored Fields:',
                        ignoredFields,
                        'Ignored Paths:',
                        ignoredPaths
                    )

                let populateObject = getFullPopulateObject(
                    model.uid,
                    limitedDepth,
                    skipCreatorFields,
                    ignoredFields,
                    ignoredPaths,
                    debug
                )

                debug && console.log('POPULATE OBJECT:', JSON.stringify(populateObject, null, 2)) // Debug

                // Override the populate object with the one returned from the function
                if (typeof populateObject === 'object') {
                    event.params.populate = populateObject.populate
                } else {
                    event.params.populate = {}
                }
            }
        }
    })
}

export default bootstrap
