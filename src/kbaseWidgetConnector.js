/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'q'
], function ($, q) {
    'use strict';
    
        function widgetConnector(config) {
            var widget, mount, container, $container;
            
            var module = config.module;

            function init() {
                return q.Promise(function (resolve) {
                    require([module], function (Widget) {
                        if (!Widget) {
                            throw new Error('Widget module did not load properly (undefined) for ' + config.module);
                        }
                        widget = Object.create(Widget);
                        resolve();
                    });
                });
            }
            function attach(node) {
                return q.Promise(function (resolve) {
                    mount = node;
                    container = document.createElement('div');
                    $container = $(container);
                    mount.appendChild(container);
                    resolve();
                });
            }
            function start(params) {
                return q.Promise(function (resolve) {
                    // The config is supplied by the caller, but we add 
                    // standard properties here.
                    /* TODO: be more generic */
                    // But then again, a widget constructed on this model does
                    // not need a connector!
                    // not the best .. perhaps merge the params into the config
                    // better yet, rewrite the widgets in the new model...
                    var widgetConfig = config.config || params || {};
                    widgetConfig.container = $container;
                    widgetConfig.userId = params.username;
                    widget.init(widgetConfig);
                    widget.go();
                    
                    resolve();
                });
            }
            function stop() {
                return q.Promise(function (resolve) {
                    widget.stop();
                    resolve();
                });
            }
            function detach() {
                return q.Promise(function (resolve) {
                    resolve();
                });
            }
            function destroy() {
                return q.Promise(function (resolve) {
                    resolve();
                });
            }

            return {
                init: init,
                attach: attach,
                start: start,
                stop: stop,
                detach: detach,
                destroy: destroy
            };
        }
        
        return {
            create: function (config) {
                return widgetConnector(config);
            }
        };
    });