/**
 * Widget to that routes to the narrative interface, or creates new narratives for you
 *
 * @author Michael Sneddon <mwsneddon@lbl.gov>
 * @public
 */
//TODO if the app doesn't exist, display message
//TODO create the workspace *after* setting everything up
//TODO handle case when one or more workspaces have had narrative deleted but still have narrative metadata
//TODO parameters to set field contents: step #, field name, value
(function( $, undefined ) {

    $.KBWidget({
        name: "kbaseNarrativeManager", 
        parent: "kbaseAuthenticatedWidget",
        version: "1.0.0",
        
        dontRedirect: false, //for testing


        /*
          params should have the following fields:

          action: start | new
         */
        options: {
            loadingImage: "assets/img/ajax-loader.gif",
            nms_url: "https://kbase.us/services/narrative_method_store/rpc",
            ws_url: "https://kbase.us/services/ws",
//            ws_url: "https://dev03.berkeley.kbase.us/services/ws",
            params: null
        },

        manager:null,

        ws_name: null,
        nar_name: null,

        $mainPanel: null,
        $newNarrativeLink: null, // when a new narrative is created, gives a place to link to it
        $errorPanel: null,

        init: function(options) {
            this._super(options);

            // must be logged in!
            if (!this._attributes.auth) {
                window.location.replace("#/login/");
            }
            if (!this._attributes.auth.token) {
                window.location.replace("#/login/");
            }
            if (!this._attributes.auth.user_id) {
                window.location.replace("#/login/");
            }

            this.$errorPanel = $('<div>');
            this.$elem.append(this.$errorPanel);

            this.$mainPanel = $('<div>').css({'height': '300px'})
                    .append('<img src=' + this.options.loadingImage +
                            '> loading...');
            this.$elem.append(this.$mainPanel);

            this.manager = new NarrativeManager({ws_url: this.options.ws_url,
                nms_url: this.options.nms_url}, this._attributes.auth);

            this.determineActionAndDoIt();

            return this;
        },
        
        showError: function(message) {
            var self = this;
            console.error(message);
            self.$errorPanel.append($('<div>')
                    .addClass('alert alert-danger alert-dismissible')
                    .attr('role', 'alert')
                    .append(message)
                    .append($('<button>').addClass('close')
                            .attr('type', 'button')
                            .attr('data-dismiss', 'alert')
                            .attr('aria-label', 'Close')
                            .append($('<span>').attr('aria-hidden', 'true')
                                    .append('&times;'))
                    )
            );
        },

        determineActionAndDoIt: function() {
            var self = this;
            if (self.options.params == null) {
                showError("Recieved no parameter info - cannot proceed.");
                return;
            }
            // START - load up last narrative, or start the user's first narrative
            if (self.options.params.action === 'start') {
                self.startOrCreateEmptyNarrative();
            } else if (self.options.params.action === 'new') {
                self.createNewNarrative(self.options.params);
            } else {
                self.showError('action "' +
                        self.options.params.action +
                        '" not supported; only "start" or "new" accepted.');
            }
        },
        
        createNewNarrative: function(params) {
            var self = this;
            var importData = null;
            if (params.copydata) {
                importData = params.copydata.split(';');
            }
            var cells = [];
            if (params.app) {
                cells = [{app: params.app}];
            }
            self.manager.createTempNarrative(
                    {cells:cells, parameters:[], importData : importData},
                    function(info) {
                        self.redirect(info.nar_info[6], info.nar_info[0]);
                    },
                    function(error) {
                        self.showError(error);
                    }
            );
        },
        
        startOrCreateEmptyNarrative: function() {
            var self = this;
            self.manager.detectStartSettings(
                    function(result) {
                        console.log(result);
                        if (result.last_narrative) {
                            // we have a last_narrative, so go there
                            //console.log('should redirect...');
                            self.redirect(result.last_narrative.ws_info[0],
                                    result.last_narrative.nar_info[0]);
                        } else {
                            //we need to construct a new narrative- we have a first timer
                            self.manager.createTempNarrative(
                                    {cells:[],parameters:[],importData : []},
                                    function(info) {
                                        self.redirect(info.nar_info[6],
                                                info.nar_info[0]);
                                    },
                                    function(error) {
                                        self.showError(error);
                                    }
                            );
                        }
                    },
                    function(error) {
                        self.showError(error);
                    }
            );
        },
        
        redirect: function(workspaceId, objId) {
            var self = this;
            self.$mainPanel.html(
                    'redirecting to <a href="/narrative/ws.' + workspaceId +
                    '.obj.' + objId + '">/narrative/ws.' + workspaceId +
                    '.obj.' + objId + '</a>');
            if (!self.dontRedirect) {
                window.location.replace("/narrative/ws." + workspaceId +
                        ".obj." + objId);
            }
        }
    });

})( jQuery );
