/*global
 define
 */
/*jslint
 white: true
 browser: true
 */
define(['jquery', 'q'], function ($, q) {
    'use strict';
    function getJSON(arg) {
        if (arg.sync) {
            var returnData;
            $.get({
                url: '/data/' + arg.path + '/' + arg.file + '.json', // should not be hardcoded!! but figure that out later
                async: false,
                dataType: 'json',
                beforeSend: function (xhr) {
                    console.log('sending...');
                },
                success: function (data) {
                    console.log('SUCCESS'); console.log(data);
                    returnData = data;
                },
                error: function (err) {
                    throw new Error('Error getting data: ' + arg.file);
                },
                complete: function (jq, status) {
                    console.log('COMPLETE'); console.log(status);
                }
            });
            console.log('here');
            return returnData;
        } else {
            return q($.get('/data/' + arg.path + '/' + arg.file + '.json'));
        }
    }

    return {
        getJSON: getJSON
    };
});