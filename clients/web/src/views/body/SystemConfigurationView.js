import $ from 'jquery';
import _ from 'underscore';

import AccessWidget from 'girder/views/widgets/AccessWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest, cancelRestRequests } from 'girder/rest';
import { restartServerPrompt } from 'girder/server';
import CollectionCreationPolicyModel from 'girder/models/CollectionCreationPolicyModel';

import SystemConfigurationTemplate from 'girder/templates/body/systemConfiguration.pug';

import 'girder/stylesheets/body/systemConfig.styl';

import 'bootstrap/js/collapse';
import 'bootstrap/js/tooltip';
import 'bootstrap/js/transition';
import 'bootstrap-switch'; // /dist/js/bootstrap-switch.js',
import 'bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.css';

/**
 * The system config page for administrators.
 */
var SystemConfigurationView = View.extend({
    events: {
        'submit .g-settings-form': function (event) {
            event.preventDefault();
            this.$('.g-submit-settings').girderEnable(false);
            this.$('#g-settings-error-message').empty();

            this.$('#g-core-collection-create-policy').val(JSON.stringify(this._covertCollectionCreationPolicy()));
            var settings = _.map(this.settingsKeys, function (key) {
                if (key === 'core.route_table') {
                    return {
                        key: key,
                        value: _.object(_.map($('.g-core-route-table'), function (el) {
                            return [$(el).data('webroot-name'), $(el).val()];
                        }))
                    };
                }

                return {
                    key: key,
                    value: this.$('#g-' + key.replace(/[_.]/g, '-')).val() || null
                };
            }, this);

            restRequest({
                type: 'PUT',
                path: 'system/setting',
                data: {
                    list: JSON.stringify(settings)
                },
                error: null
            }).done(_.bind(function () {
                this.$('.g-submit-settings').girderEnable(true);
                events.trigger('g:alert', {
                    icon: 'ok',
                    text: 'Settings saved.',
                    type: 'success',
                    timeout: 4000
                });
            }, this)).fail(_.bind(function (resp) {
                this.$('.g-submit-settings').girderEnable(true);
                this.$('#g-settings-error-message').text(resp.responseJSON.message);
            }, this));
        },
        'click #g-restart-server': restartServerPrompt
    },

    initialize: function () {
        cancelRestRequests('fetch');

        var keys = [
            'core.cookie_lifetime',
            'core.email_from_address',
            'core.email_host',
            'core.registration_policy',
            'core.email_verification',
            'core.server_root',
            'core.smtp_host',
            'core.smtp.port',
            'core.smtp.encryption',
            'core.smtp.username',
            'core.smtp.password',
            'core.upload_minimum_chunk_size',
            'core.cors.allow_origin',
            'core.cors.allow_methods',
            'core.cors.allow_headers',
            'core.add_to_group_policy',
            'core.collection_create_policy',
            'core.user_default_folders',
            'core.route_table'
        ];
        this.settingsKeys = keys;
        restRequest({
            path: 'system/setting',
            type: 'GET',
            data: {
                list: JSON.stringify(keys),
                default: 'none'
            }
        }).done(_.bind(function (resp) {
            this.settings = resp;
            restRequest({
                path: 'system/setting',
                type: 'GET',
                data: {
                    list: JSON.stringify(keys),
                    default: 'default'
                }
            }).done(_.bind(function (resp) {
                this.defaults = resp;
                this.render();
            }, this));
        }, this));
    },

    render: function () {
        this.$el.html(SystemConfigurationTemplate({
            settings: this.settings,
            defaults: this.defaults,
            routes: this.settings['core.route_table'] || this.defaults['core.route_table'],
            routeKeys: _.sortBy(_.keys(this.settings['core.route_table'] ||
                                       this.defaults['core.route_table']),
                                function (a) {
                                    return a.indexOf('core_') === 0 ? -1 : 0;
                                }),
            JSON: window.JSON
        }));

        this.$('input[title]').tooltip({
            container: this.$el,
            animation: false,
            delay: { show: 200 }
        });

        var enableCollectionCrreationPolicy = this.settings['core.collection_create_policy'] ? this.settings['core.collection_create_policy'].open : false;

        this.$('.g-plugin-switch')
            .bootstrapSwitch()
            .bootstrapSwitch('state', enableCollectionCrreationPolicy)
            .off('switchChange.bootstrapSwitch')
            .on('switchChange.bootstrapSwitch', (event, state) => {
                if (state) {
                    this._renderCollectionCreationPolicyAccessWidget();
                } else {
                    this.accessWidget.destroy();
                    this.accessWidget = null;
                }
            });

        if (enableCollectionCrreationPolicy) {
            this._renderCollectionCreationPolicyAccessWidget();
        }

        return this;
    },

    _renderCollectionCreationPolicyAccessWidget: function () {
        var collectionCreationPolicyModel = new CollectionCreationPolicyModel();

        this.accessWidget = new AccessWidget({
            el: this.$('.g-collection-create-policy-container .access-widget-container'),
            modelType: 'collection_creation_policy',
            model: collectionCreationPolicyModel,
            parentView: this,
            modal: false,
            hideRecurseOption: true,
            hideSaveButton: true,
            hidePrivacyEditor: true,
            hideAccessType: true,
            noAccessFlag: true
        });
    },

    _covertCollectionCreationPolicy: function () {
        // get collection creation policy from AccessWidget and format the result properly
        var settingValue = null;
        if (this.$('.g-plugin-switch').bootstrapSwitch('state')) {
            settingValue = { open: this.$('.g-plugin-switch').bootstrapSwitch('state') };
            var accessList = this.accessWidget.getAccessList();
            _.each(_.keys(accessList), key => {
                settingValue[key] = _.pluck(accessList[key], 'id');
            });
        } else {
            settingValue = this.settings['core.collection_create_policy'] || this.defaults['core.collection_create_policy'];
            settingValue['open'] = false;
        }
        return settingValue;
    }
});

export default SystemConfigurationView;

