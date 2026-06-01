/**
 * Loads deployment.config.json — edit that file to change hosting behaviour.
 * Documentation: ../../HOSTING.md
 */
import deploymentConfig from './deployment.config.json'

export default deploymentConfig

export const DEPLOYMENT_MODES = ['auto', 'official', 'selfhost', 'organization']
