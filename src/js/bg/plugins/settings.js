/**
* This module takes care of dealing with all
* settings and responding to changes to it.
* @module ModuleSettings
*/
const Plugin = require('vialer-js/lib/plugin')


/**
* Main entrypoint for Settings.
* @memberof AppBackground.plugins
*/
class PluginSettings extends Plugin {
    /**
    * Initializes the module's store.
    * All application runtime settings are defined here. Build-time
    * settings go in the ``~/.vialer-jsrc` file.
    * @returns {Object} The module's store properties.
    */
    _initialState() {
        let state = {
            click2dial: {
                blacklist: [
                    '^chrome',
                    // we prefer not to add icons in documents
                    '^https?.*docs\\.google\\.com.*$',
                    '^https?.*drive\\.google\\.com.*$',
                    // Pages on these websites tend to grow too large to parse them in
                    // a reasonable amount of time.
                    '^https?.*bitbucket\\.org.*$',
                    '^https?.*github\\.com.*$',
                    '^https?.*rbcommons\\.com.*$',
                    // This site has at least tel: support and uses javascript to open
                    // a new web page when clicking the anchor element wrapping the
                    // inserted icon.
                    '^https?.*slack\\.com.*$',
                ],
                enabled: true,
            },
            language: {
                options: [
                    {id: 'en', name: 'english'},
                    {id: 'nl', name: 'nederlands'},
                ],
                selected: {id: null, name: null},
            },
            platform: {
                enabled: true,
                url: process.env.PLATFORM_URL,
            },
            ringtones: {
                options: [
                    {id: 1, name: 'default.ogg'},
                ],
                selected: {id: 1, name: 'default.ogg'},
            },
            telemetry: {
                analyticsId: process.env.ANALYTICS_ID,
                clientId: null,
                enabled: false,
                sentryDsn: process.env.SENTRY_DSN,
            },
            webrtc: {
                account: {
                    options: [], // Platform integration provides options.
                    selected: {id: null, password: null, uri: null, username: null},
                    status: null,
                },
                codecs: {
                    options: [
                        {id: 1, name: 'G722'},
                        {id: 2, name: 'opus'},
                    ],
                    selected: {id: 1, name: 'G722'},
                },
                devices: {
                    input: [],
                    output: [],
                    ready: true,
                    sinks: {
                        headsetInput: {id: 'default', name: this.app.$t('default').capitalize()},
                        headsetOutput: {id: 'default', name: this.app.$t('default').capitalize()},
                        ringOutput: {id: 'default', name: this.app.$t('default').capitalize()},
                        speakerInput: {id: 'default', name: this.app.$t('default').capitalize()},
                        speakerOutput: {id: 'default', name: this.app.$t('default').capitalize()},
                    },
                    speaker: {
                        enabled: false,
                    },
                },
                enabled: true,
                endpoint: {
                    uri: process.env.SIP_ENDPOINT,
                },
                media: {
                    permission: true,
                    type: {
                        options: [
                            {id: 'AUDIO_NOPROCESSING', name: this.app.$t('audio without processing')},
                            {id: 'AUDIO_PROCESSING', name: this.app.$t('audio with processing')},
                        ],
                        selected: {id: 'AUDIO_NOPROCESSING', name: this.app.$t('audio without processing')},
                    },
                },
                stun: process.env.STUN,
                toggle: true,
            },
            wizard: {
                completed: false,
                steps: {
                    options: [
                        {name: 'WizardWelcome'},
                        {name: 'WizardTelemetry'},
                        {name: 'WizardAccount'},
                        {name: 'WizardMicPermission'},
                        {name: 'WizardDevices'},
                    ],
                    selected: {name: 'WizardWelcome'},
                },
            },
        }

        // The selection flag determines whether the UI should include endpoint selection.
        state.webrtc.endpoint.selection = Boolean(state.webrtc.endpoint.uri)
        return state
    }


    /**
    * Refresh the devices list when this plugin is started, but
    * only if the Vault is unlocked, because the devices list is
    * stored in the encrypted part of the store, which should be
    * available at that point. An additional vault unlock watcher
    * is used to refresh the devices list when auto unlocking is
    * disabled.
    */
    _ready() {
        if (this.app.state.settings.telemetry.enabled) {
            const release = process.env.VERSION + '-' + process.env.DEPLOY_TARGET + '-' + process.env.BRAND_NAME + '-' + this.app.env.name
            this.app.logger.info(`${this}monitoring exceptions for release ${release}`)
            Raven.config(process.env.SENTRY_DSN, {
                allowSecretKey: true,
                environment: process.env.DEPLOY_TARGET,
                release,
                tags: {
                    sipjs: SIP.version,
                    vuejs: Vue.version,
                },
            }).install()

            Raven.setUserContext({
                email: this.app.state.user.username,
                id: `${this.app.state.user.client_id}/${this.app.state.user.id}`,
            })
        } else {
            Raven.uninstall()
        }
    }


    /**
    * Respond to changes in settings, like storing the Vault key,
    * send a telemetry event when Telemetry is switched on or off,
    * toggle the Click-to-dial icon observer, etc..
    * @returns {Object} The store properties to watch.
    */
    _watchers() {
        return {
            'store.settings.click2dial.enabled': (enabled) => {
                if (this.app.env.isExtension) {
                    this.app.plugins.extension.tabs.signalIcons({enabled})
                }
            },
            'store.settings.telemetry.enabled': (enabled) => {
                this.app.logger.info(`${this}switching sentry exception monitoring ${enabled ? 'on' : 'off'}`)
                if (enabled) {
                    const sentryDsn = this.app.state.settings.telemetry.sentryDsn
                    Raven.config(sentryDsn, {
                        allowSecretKey: true,
                        environment: process.env.DEPLOY_TARGET,
                        release: this.app.state.app.version.current,
                    }).install()
                } else {
                    this.app.logger.info(`${this}stop raven exception monitoring`)
                    Raven.uninstall()
                }
                this.app.emit('bg:telemetry:event', {eventAction: 'toggle', eventLabel: enabled, eventName: 'telemetry', override: true})
            },
            /**
            * The default value is true.
            * @param {Boolean} enabled - Permission granted?
            */
            'store.settings.webrtc.media.permission': (enabled) => {
                if (enabled) {
                    this.app.devices.verifySinks()
                }
            },
            /**
            * The `toggle` flag is an intention to switch WebRTC on or off.
            * The `enabled` flag is to mark the current operation modus.
            * @param {Boolean} toggled - Whether WebRTC should be enabled or not.
            */
            'store.settings.webrtc.toggle': async(toggled) => {
                if (toggled) {
                    // Mainly used in the wizard to set an account with WebRTC
                    // turned off. At the end of the wizard WebRTC is turned on
                    // and the connection is made.
                    await this.app.setState({settings: {webrtc: {enabled: true}}}, {persist: true})
                    this.app.logger.debug(`${this}webrtc switched on; connecting.`)
                    // this.app.plugins.calls.connect({register: this.app.state.settings.webrtc.enabled})
                } else {
                    const fallback = this.app.utils.copyObject(this.app.state.user.platform.account.fallback)
                    this.app.logger.info(`${this}reset account to platform account ${fallback.username}`)
                    await this.app.setState({settings: {webrtc: {account: {selected: fallback}, enabled: false}}}, {persist: true})
                }
            },
        }
    }


    /**
    * Generate a representational name for this module. Used for logging.
    * @returns {String} - An identifier for this module.
    */
    toString() {
        return `${this.app}[settings] `
    }
}

module.exports = PluginSettings
