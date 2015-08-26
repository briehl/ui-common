define(['q'], function (q) {
    'use strict';
    
    var widget = function (config) {
        var mount, container;
        
        function attach(node) {
            return q.Promise(function (resolve) {
                mount = node;
                container = document.createElement('div');
                mount.appendChild(container);
                resolve();
            });
        }
        
        function start(params) {
            return q.Promise(function (resolve) {
                container.innerHTML = 'Hi, I am a widget';
            });
        }
        
        return {
            // optional
            init: null,
            // required
            attach: attach,
            // required
            start: start,
            // optional
            run: null,
            // optional
            stop: null,
            // optional
            detach: null,
            // optional
            dispose: null
        };
    };
    
    return {
        make: function (config) {
            return widget(config);
        }
    };
});
