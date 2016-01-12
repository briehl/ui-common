/* Directives */

var kbaseNarrativeManager = angular.module('NarrativeManager', []);

kbaseNarrativeManager.factory('NarrativeManager', function() {
    return kbaseNarrativeManager();
});


// define Search as its own module, and what it depends on
var homologyApp = angular.module('homology', ['ui.router','ui.bootstrap','NarrativeManager']);


// enable CORS for Angular
homologyApp.config(function($httpProvider,$stateProvider,$provide) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];

        $stateProvider
            .state('homology', {
                url: "/homology/?q&category&page&itemsPerPage&sort&facets",
                templateUrl: 'views/homology/homology.html',
                controller: 'homologyController'
            });

        $provide.decorator('$rootScope', ['$delegate', function ($delegate) {
            //Object.defineProperty($delegate.constructor.prototype, '$bus', {
            //    get: function() {
            //        var self = this;
			//
            //        return {
            //            subscribe: function() {
            //                var sub = postal.subscribe.apply(postal, arguments);
			//
            //                self.$on('$destroy',
            //                    function() {
            //                        sub.unsubscribe();
            //                    }
            //                );
            //            },
            //            channel: postal.channel,
            //            publish: postal.publish
            //        };
            //    },
            //    enumerable: false
            //});

            return $delegate;
        }]);

        
        $(document).ajaxStop($.unblockUI());
    }
);


homologyApp.factory("require", function($rootScope) {
    function requireProxy(dependencies, successCallback, errorCallback) {
        successCallback = (successCallback || angular.noop);
        errorCallback = (errorCallback || angular.noop);

        require( (dependencies || []), 
            function successCallbackProxy() {
                var args = arguments;

                $rootScope.$apply(function() {
                    successCallback.apply(this, args);
                });
            },
            function errorCallbackProxy() {
                var args = arguments;

                $rootScope.$apply(function() {
                    errorCallback.apply( this, args );
                });
            }
        );

    }

    return( requireProxy );
});


/* Services */

/*
 *  This service is responsible for fetching the search service category information.
 */

homologyApp.service('searchKBaseClientsService', function($q, $http, $rootScope) {
    return {
        getWorkspaceClient : function(token) {
            return new Workspace($rootScope.kb.ws_url, {token: token});
        },
        getNarrativeManager : function(token) {
            return new NarrativeManager({ws_url: $rootScope.kb.ws_url,
                                         nms_url: $rootScope.kb.nms_url},
                                         token);
        }
    };
});


/*
 *  This service houses the various options captured for Search, some of which
 *  are housed in local storage for persistence.
 */
homologyApp.service('searchOptionsService', function searchOptionsService() {
    var genomesWorkspace = "KBasePublicGenomesV4";
    var searchGenomesWorkspace = "KBasePublicRichGenomesV4";
    var metagenomesWorkspace = "wilke:Data";

    var session = $.KBaseSessionSync.getKBaseSession();

    if (!session) {
        session = {token: null, user_id: null, name: null};
    }

    // Model data that is specific to each search instance
    var _sessionUserData = {
        "token": session.token,
        "user_id": session.user_id,
        "name": session.name,
        "selectAll": {},
        "selectedWorkspace": null,
        "viewType": "compact",
        "breadcrumbs": {},
        "displayWorkspaces": false,
        "set": {
            'features': true
        },
        "data_cart": {
            size: 0,
            all: false,
            data: {},
            types: {
                'features': {all: false, size: 0, markers: {}}
            }
        },
        "transfer_cart": {
            size: 0,
            items: {}
        },
        "version": 0.6
    };

    // Model data that persists for all searches
    var _longtermUserData = {
        "workspaces": null,
        "version": 0.6
    };


    if (!sessionStorage.hasOwnProperty("searchUserState") || (!sessionStorage.searchUserState.version || sessionStorage.searchUserState.version < _sessionUserData.version)) {
        sessionStorage.setItem("searchUserState", JSON.stringify(_sessionUserData));
    }

    for (var p in _sessionUserData) {
        if (_sessionUserData.hasOwnProperty(p) && !sessionStorage.searchUserState.hasOwnProperty(p)) {
            sessionStorage.searchUserState[p] = _sessionUserData[p];
        }
    }

    if (!localStorage.hasOwnProperty("searchUserState") || (!localStorage.searchUserState.version || localStorage.searchUserState.version < _longtermUserData.version)) {
        localStorage.setItem("searchUserState", JSON.stringify(_longtermUserData));
    }

    for (var p in _longtermUserData) {
        if (_longtermUserData.hasOwnProperty(p) && !localStorage.searchUserState.hasOwnProperty(p)) {
            localStorage.searchUserState[p] = _longtermUserData[p];
        }
    }

    return {
        categoryInfo : {},
        searchCategories : {},
        categoryRelationships : {},
        expandedCategories : {
            'features': true
        },
        related: {},
        numPageLinks : 10,
        defaultSearchOptions : {
                                "general": {
                                    "itemsPerPage": 10,
                                    "program": "blastp",
                                    //"genome_ids": ["879462.4"],
                                    "genome_ids": ["83333.84", "83332.12", "1005566.3",   "1005567.3",   "1005703.3",   "1005704.3",   "1005705.3", "1005706.3",   "1005941.3",   "1005994.3",   "1005995.3",   "1005996.3", "1005999.3",   "1005999.4",   "1006000.3",   "1006003.3",   "1006004.4", "1006006.8",   "1006007.3",   "1006543.3",   "1006551.4",   "1006554.3", "1006579.6",   "1006581.3",   "1007064.3",   "1007096.3",   "1007103.3", "1007104.3",   "1007105.3",   "1007109.3",   "1007110.3",   "1007111.3"],
                                    "max_hit": 10,
                                    "evalue": "1e-10"
                                },
                                "perCategory": {}
                               },
        categoryCounts : {},
        searchOptions : this.defaultSearchOptions,
        defaultMessage : "KBase is processing your request...",
        userState: {
                    "longterm": JSON.parse(localStorage.searchUserState),
                    "session": JSON.parse(sessionStorage.searchUserState)
                   },
        publicWorkspaces: {
                           "search_genome": searchGenomesWorkspace,
                           "genomes": genomesWorkspace,
                           "features": genomesWorkspace,
                           "metagenomes": metagenomesWorkspace
                          },
        landingPagePrefix: "/functional-site/#/dataview/",
        iconMapping: {
            "features": "<span class='fa-stack'><i class='fa fa-circle fa-stack-2x' style='color: rgb(63, 81, 181);'></i><i class='icon fa-inverse fa-stack-1x icon-genome kb-data-icon-dnudge'></i></span>",
            "all": "<span class='fa-stack'><img id='logo' src='assets/navbar/images/kbase_logo.png' width='46'></span>"
        },
        resultJSON : {},
        objectCopyInfo : null,
        resultsAvailable : false,
        countsAvailable : false,
        transferring: false,
        objectsTransferred: 0,
        transferSize: 0,
        selectedCategory : "features",
        pageLinksRange : [],
        active_sorts: {},
        open_facet_panels: {},
        data_tabs: {},
        duplicates: {},

        reset : function() {
            this.categoryCounts = {};
            this.resultJSON = {};
            this.objectCopyInfo = null;
            this.resultsAvailable = false;
            this.countsAvailable = false;
            this.transferring = false;
            this.objectsTransferred = 0;
            this.transferSize = 0;
            this.selectedCategory = null;
            this.pageLinksRange = [];
            this.active_sorts = {};
            this.open_facet_panels = {};
            this.data_tabs = {};
            this.duplicates = {};

            this.searchOptions = this.defaultSearchOptions;

            this.userState = {
                               "longterm": JSON.parse(localStorage.searchUserState),
                               "session": JSON.parse(sessionStorage.searchUserState)
            };
        }
    };
});


/* Filters */

homologyApp.filter('highlight', function($sce) {
    return function(input, tokens) {
        if (tokens.length == 0 || tokens.length == 1 && tokens[0] == '*') {
            return input;
        }
    
        if (input) {    
            console.log(tokens);
            var regex = new RegExp('(' + tokens.join('|') + ')', 'ig');
            console.log(regex.string);
            console.log(input.replace(regex, '<span class="search-result-highlight">$&</span>'));
            return $sce.trustAsHtml(input.replace(regex, '<span class="search-result-highlight">$&</span>'));
        }
        
        return input;
    };
});


/* Controllers */

// This controller is responsible for the Search Data Nav and connects to the Search view controller


/*
 *  The main Search controller that is responsible for content inside the Search view.
 */
homologyApp.controller('homologyController', function searchCtrl($rootScope, $scope, $q, $timeout, $http, $state, $stateParams, searchCategoryLoadService, searchOptionsService, searchKBaseClientsService, require) {
    $scope.options = searchOptionsService;
    $scope.workspace_service;
    $scope.narrative_manager;

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (toState.name === "homology") {
            //console.log($scope.options.userState);
            //console.log("state change to search");
            $scope.startSearch();
        }
    });


    $scope.$bus.subscribe({
        channel: 'session',
        topic: 'login.success',
        callback: function(sessionObject) {
            var session = sessionObject.getKBaseSession();
            $scope.options.userState.session.token = session.token;
            $scope.options.userState.session.user_id = session.token;
            $scope.options.userState.session.name = session.token;
        }
    });

    $scope.availablePrograms = [{value: "blastn", label: "blastn"},
        {value: "blastp", label: "blastp", selected:true},
        {value: "blastx", label: "blastx"},
        {value: "tblastn", label: "tblastn"},
        {value: "tblastx", label: "tblastx"}
    ];

    $scope.targetSequences = [{value:1, label:"1"},
        {value: 10, label: "10", selected: true},
        {value: 100, label: "100"},
        {value: 1000, label: "1000"}
    ];

    $scope.login = function() {
        postal.channel('loginwidget').publish('login.prompt');
    };


    $scope.logout = function() {
        $stateParams = {};
        postal.channel('session').publish('logout.request');
    };


    $scope.setNavbarTitle = function(title) {
        require(['kb.widget.navbar'], function (Navbar) {
            $scope.navbar = Navbar;
            $scope.navbar.clearMenu();
            $scope.navbar.addDefaultMenu({search: false});
            $scope.navbar.clearTitle();
            $scope.navbar.clearButtons();

            $scope.navbar.setTitle(title);

            //Navbar.addButton("Help");
            //Navbar.addHelpMenuItem({title: "Search User Guide"});
        });
    };


    $scope.saveUserState = function() {
        localStorage.setItem("searchUserState", JSON.stringify($scope.options.userState.longterm));
        sessionStorage.setItem("searchUserState", JSON.stringify($scope.options.userState.session));
    };


    $scope.loadCategories = function() {

        $scope.options.templates = {};
        $scope.options.templates["root"] = "views/homology/homologyResult.html";
        $scope.options.templates["header"] = "views/homology/features_header.html";
        $scope.options.templates["rows"] = "views/homology/features_rows.html";
    };


    $scope.sanitizeFacets = function(input_facets) {
        var encodedFacets = "";
        var facets = input_facets.split(",");
        var currentFacet;

        for (var i = 0; i < facets.length; i++) {
            currentFacet = facets[i].split(":");

            if (currentFacet[1].indexOf('"') < 0) {
                encodedFacets += currentFacet[0] + ":" + '"' + currentFacet[1] + '",';
            }
            else {
                encodedFacets += currentFacet[0] + ":" + currentFacet[1] + ',';
            }
        }

        //console.log(encodedFacets);
        return encodedFacets.substring(0,encodedFacets.length-1);
    };


    $scope.getTotalCount = function() {
        return $scope.options.resultJSON.totalResults;
    };

    $scope.getHomologyResults = function(options){

        var query = {
            "program": options.program,
            "parameters": [],
            "output_format": "tabular",
            "evalue": options.threshold,
            "max_hits": options.max_target,
            "min_coverage": 70,
            "query": options.sequence,
            "subject_genome": options.genome_ids
        };

        $("#loading_message_text").html(options.defaultMessage);
        $.blockUI({message: $("#loading_message")});

        $http({method: 'POST',
            url: "http://larch.mcs.anl.gov:7133/search",
            data: JSON.stringify(query)
        }).then(function (response) {

            $scope.options.resultJSON = {
                items: $scope.parseTabularOutput(response.data),
                itemCount: 10,
                currentPage: 1,
                itemsPerPage: 10
            };
            $scope.options.resultJSON.totalResults = $scope.options.resultJSON.items.length;
            $scope.options.resultsAvailable = true;

            console.log($scope.options.resultJSON);

            var position = $scope.options.resultJSON.currentPage % $scope.options.numPageLinks;
            var start;

            if (position === 0) {
                start = $scope.options.resultJSON.currentPage - $scope.options.numPageLinks + 1;
            }
            else {
                start = $scope.options.resultJSON.currentPage - position + 1;
            }

            var end = start + $scope.options.numPageLinks;

            for (var p = start; p < end && (p - 1) * $scope.options.resultJSON.itemsPerPage < $scope.options.resultJSON.totalResults; p++) {
                $scope.options.pageLinksRange.push(p);
            }

            if ($scope.options.resultJSON.items.length > 0) {
                $scope.options.currentItemRange = $scope.options.resultJSON.items[0].position + "-" + $scope.options.resultJSON.items[$scope.options.resultJSON.items.length - 1].position;
            }
            else {
                console.log($scope.options);
            }

            $.unblockUI();

        }, function (error) {
            console.log("getResults threw an error!");
            console.log(error);
            $scope.options.resultsAvailable = false;
            $.unblockUI();
        }, function (update) {
            console.log(update);
        });
    };

    $scope.parseTabularOutput = function(output){
        var lines = output.split('\n');
        var entries = [];
        lines.forEach(function(line, index){
            var cols = line.split('\t');
            if(cols.length > 1){
                entries.push({
                    "row_id": cols[1].split('|').slice(0,2).join("|"),
                    "object_type": "KBaseSearch.Feature",
                    "object_id": "",
                    "position": (index+1),
                    "qseqid": cols[0],
                    "sseqid": cols[1],
                    "pident": Number(cols[2]),
                    "length": Number(cols[3]),
                    "mismatch": cols[4],
                    "gapopen": cols[5],
                    "qstart": Number(cols[6]),
                    "qend": Number(cols[7]),
                    "sstart": Number(cols[8]),
                    "send": Number(cols[9]),
                    "evalue": cols[10],
                    "bitscore": cols[11]
                });
            }
        });
        return entries;
    };

    $scope.newSearch = function () {

        if ($scope.options.searchOptions.general.sequence && $scope.options.searchOptions.general.sequence.length > 0){
            $scope.getHomologyResults($scope.options.searchOptions.general);
        }

        //if ($scope.options.searchOptions.general.q && $scope.options.searchOptions.general.q.length > 0) {
        //    $scope.saveUserState();
		//
        //    // if we are in the category view, update the individual count
        //    if ($scope.options.selectedCategory) {
        //        $scope.getCount({q: $scope.options.searchOptions.general.q}, $scope.options.selectedCategory);
        //        $state.go('homology', {q: $scope.options.searchOptions.general.q, category: $scope.options.selectedCategory, page: 1, sort: null, facets: null});
        //    }
        //    else {
        //        $state.go('homology', {q: $scope.options.searchOptions.general.q});
        //    }
        //}
    };


    $scope.startSearch = function () {
        $scope.searchActive = true;
        $scope.options.tokens = [];

        //console.log("Starting search with : " + $stateParams.q);
        //console.log($stateParams);

        var init = function () {
            // in here we initialize anything we would want to reset on starting a new search
            //return searchCategoryLoadService.getCategoryInfo().then(function(results) {
            //    $scope.options.categoryInfo = results.data;
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise.then(function(){
                $scope.options.categoryInfo.displayTree = true;
                $scope.loadCategories();
            });
        };

        var captureState = function () {
            if ($scope.options.searchOptions === undefined) {
                $scope.options.reset();
            }

            // apply query string
            if ($stateParams.q !== undefined && $stateParams.q !== null && $stateParams.q !== '') {
                $scope.options.searchOptions.general.q = $stateParams.q;
                $scope.options.tokens = $stateParams.q.split(" ");
                console.log($scope.options.tokens);
            }
            else { // search view reached without a query, reset
                $scope.options.reset();
            }

            // apply category selection
            if ($stateParams.category !== null && $stateParams.category in $scope.options.searchCategories) {
                $scope.options.selectedCategory = $stateParams.category;

                $scope.setNavbarTitle("Search <span class='search-navbar-title'>" +
                                      $scope.options.iconMapping[$scope.options.selectedCategory] +
                                      $scope.options.searchCategories[$stateParams.category]["label"] + "</span>");

                if ($scope.options.selectedCategory && !$scope.options.searchOptions.perCategory.hasOwnProperty($scope.options.selectedCategory)) {
                    $scope.options.searchOptions.perCategory[$scope.options.selectedCategory] = {"page": 1};
                }

                if ($stateParams.page !== undefined && $stateParams.page !== null) {
                    $scope.setCurrentPage($stateParams.page, false);
                }
                else {
                    $scope.setCurrentPage(1, false);
                }

                if ($stateParams.itemsPerPage !== null && $stateParams.itemsPerPage > 0 && $stateParams.itemsPerPage <= 100) {
                    $scope.options.searchOptions.general.itemsPerPage = $stateParams.itemsPerPage;
                }
                else {
                    $scope.options.searchOptions.general.itemsPerPage = 10;
                }
            }
            else {
                $scope.setNavbarTitle("Search <span class='search-navbar-title'>All Data Categories<span>");
                $scope.options.reset();
            }

            // apply facets
            if ($stateParams.facets !== null) {
                  // clear any cached facets
                  delete $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].facets;
                  $scope.options.active_facets[$scope.options.selectedCategory] = {};

                  var facetSplit = $stateParams.facets.split(",");

                  var facet_keyval = [];

                  for (var i = 0; i < facetSplit.length; i++) {
                      facet_keyval = facetSplit[i].split(":");

                      $scope.addFacet(facet_keyval[0],facet_keyval[1].replace("*",",").replace('^',':'), false);
                  }
            }
            else {
                $scope.options.facets = null;

                if ($scope.options.selectedCategory && $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].hasOwnProperty("facets")) {
                    delete $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].facets;
                    $scope.options.active_facets[$scope.options.selectedCategory] = {};
                }
            }

            // apply sorting
            if ($stateParams.sort !== null) {
                // clear any sort cached
                $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].sort = "";
                $scope.options.active_sorts[$scope.options.selectedCategory] = {count: 0, sorts: {}};

                var sortSplit = $stateParams.sort.split(",");
                var sort_keyval = [];

                for (var i = 0; i < sortSplit.length; i++) {
                    sort_keyval = sortSplit[i].split(" ");

                    $scope.addSort($scope.options.selectedCategory, sort_keyval[0], sort_keyval[1], false);
                }
            }
            else {
                $scope.options.active_sorts[$scope.options.selectedCategory] = {count: 0, sorts: {}};

                if ($scope.options.selectedCategory && $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].hasOwnProperty("sort")) {
                    delete $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].sort;
                }
            }
        };


        if (!$scope.options.categoryInfo.hasOwnProperty("displayTree")) {
            init().then(function () {
                captureState();
            });
        }
        else {
            captureState();
            //console.log("No category chosen");

            var queryOptions = {q: $scope.options.searchOptions.general.q};

            if ($scope.options.selectedCategory) {

                if ($scope.options.searchOptions.perCategory[$scope.options.selectedCategory].hasOwnProperty("sort")) {
                    queryOptions.sort = $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].sort;
                }
            }

            $scope.getHomologyResults($scope.options.searchOptions);
        }
    };



    $scope.isInActiveCategoryTree = function(value) {
        return $scope.options.related[value][$scope.options.selectedCategory];
    };


    $scope.removeSearchFilter = function(category, type, name, value) {
        //console.log("before remove");
        //console.log($scope.options.searchOptions.perCategory[category][type]);

        // e.g. filters=domain:bacteria,domain:archea,complete:true
        if ($scope.options.searchOptions.perCategory[category].hasOwnProperty(type)) {
            var oldFilter;

            if (type === "sort") {
                oldFilter = $scope.options.searchOptions.perCategory[category][type].indexOf(name);
            }

            var nextComma = $scope.options.searchOptions.perCategory[category][type].indexOf(",");

            if (oldFilter > -1) {

                if (oldFilter === 0 && nextComma < 0) {
                    // only one filter, go back to empty string
                    $scope.options.searchOptions.perCategory[category][type] = "";
                }
                else if (oldFilter === 0 && nextComma > oldFilter) {
                    // remove the beginning of the string to the comma
                    $scope.options.searchOptions.perCategory[category][type] = $scope.options.searchOptions.perCategory[category][type].substring(nextComma + 1,$scope.options.searchOptions.perCategory[category][type].length);
                }
                else if (oldFilter > 0) {
                    // must be more than one sort option, now get the comma after oldFacet
                    nextComma = $scope.options.searchOptions.perCategory[category][type].indexOf(",", oldFilter);

                    // we need to cut off the end of the string before the last comma
                    if (nextComma < 0) {
                        $scope.options.searchOptions.perCategory[category][type] = $scope.options.searchOptions.perCategory[category][type].substring(0,oldFilter - 1);
                    }
                    // we are cutting out the middle of the string
                    else {
                        $scope.options.searchOptions.perCategory[category][type] = $scope.options.searchOptions.perCategory[category][type].substring(0,oldFilter - 1) +
                            $scope.options.searchOptions.perCategory[category][type].substring(nextComma, $scope.options.searchOptions.perCategory[category][type].length);
                    }
                }
            }

            if ($scope.options.searchOptions.perCategory[category][type].length === 0) {
                delete $scope.options.searchOptions.perCategory[category][type];
            }
        }
    };


    $scope.setResultsPerPage = function (value) {
        $scope.options.searchOptions.general.itemsPerPage = parseInt(value);

        $scope.saveUserState();

        //reset the page to 1
        $state.go("homology", {itemsPerPage: $scope.options.searchOptions.general.itemsPerPage, page: 1});
    };


    $scope.addSort = function (category, name, direction, searchAgain) {
        if (!$scope.options.searchOptions.perCategory[category].hasOwnProperty("sort")) {
            $scope.options.searchOptions.perCategory[category].sort = name + " " + direction;
        }
        else {
            // attempt to remove any old sorts of this name before adding the new one
            $scope.removeSort(category, name, false);

            // sort not initialized after removal of last sort
            if (!$scope.options.searchOptions.perCategory[category].hasOwnProperty("sort")) {
                $scope.options.searchOptions.perCategory[category].sort = name + " " + direction;
            }
            // another sort exists
            else if ($scope.options.searchOptions.perCategory[category].sort.length > 0) {
                $scope.options.searchOptions.perCategory[category].sort += "," + name + " " + direction;
            }
            // sort was initialized, but empty
            else {
                $scope.options.searchOptions.perCategory[category].sort += name + " " + direction;
            }
        }

        // add this as the last sort type
        $scope.options.active_sorts[category].count = $scope.options.active_sorts[category].count + 1;
        $scope.options.active_sorts[category].sorts[name] = {order: $scope.options.active_sorts[category].count, direction: direction};

        if (searchAgain === undefined || searchAgain === true) {
            $scope.saveUserState();
            $state.go("homology", {sort: $scope.options.searchOptions.perCategory[category].sort, page: 1});
        }
    };


    $scope.removeSort = function (category, name, searchAgain) {
        $scope.removeSearchFilter(category, "sort", name, null);

        if ($scope.options.active_sorts.hasOwnProperty(category) && $scope.options.active_sorts[category].sorts.hasOwnProperty(name)) {
            // if this sort was not the last ordered sort, adjust the order of other sorts
            if ($scope.options.active_sorts[category].sorts.hasOwnProperty(name) && $scope.options.active_sorts[category].count - 1 > $scope.options.active_sorts[category].sorts[name].order) {
                for (var s in $scope.options.active_sorts[category].sorts) {
                    if ($scope.options.active_sorts[category].sorts.hasOwnProperty(s) && $scope.options.active_sorts[category].sorts[s].order > $scope.options.active_sorts[category].sorts[name].order) {
                        $scope.options.active_sorts[category].sorts[s].order -= 1;
                    }
                }
            }

            $scope.options.active_sorts[category].count -= 1;
            delete $scope.options.active_sorts[category].sorts[name];
        }

        if (searchAgain === undefined || searchAgain === true) {
            $scope.saveUserState();
            $state.go("homology", {sort: $scope.options.searchOptions.perCategory[category].sort, page: 1});
        }
    };


    $scope.setCurrentPage = function (page, searchAgain) {
        try {
            $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].page = parseInt(page);
        }
        catch(e) {
            $scope.options.searchOptions.perCategory[$scope.options.selectedCategory] = {'page': parseInt(page)};
        }

        $scope.saveUserState();

        if (searchAgain === undefined || searchAgain === true) {
            $state.go("homology", {page: $scope.options.searchOptions.perCategory[$scope.options.selectedCategory].page});
        }
    };



    $scope.setView = function (type) {
        //console.log("Setting " + type);
        $scope.options.userState.session.viewType = type;
    };


    $scope.listWorkspaces = function() {
        try {
            $scope.options.userState.session.displayWorkspaces = true;
            $scope.workspace_service = searchKBaseClientsService.getWorkspaceClient($scope.options.userState.session.token);
            $scope.options.userState.longterm.workspaces = [];

            $(".blockMsg").addClass("search-block-element");
            $("#loading_message_text").html("Looking for workspaces you can copy to...");
            $("#workspace-area").block({message: $("#loading_message")});

            //console.log("Calling list_workspace_info");

            $scope.workspace_service.list_workspace_info({"perm": "w"})
                .then(function(info, status, xhr) {
                    $scope.$apply(function () {
                        var temp = [];
                        for (var i = 0; i < info.length; i++) {
                            var narname = info[i][8].narrative_nice_name;
                            if (narname != null) {
                                temp.push(info[i]);
                            }
                        }
                        info = temp;
                        $scope.options.userState.longterm.workspaces = info.sort(function (a,b) {
                            var namea = a[8].narrative_nice_name;
                            var nameb = b[8].narrative_nice_name;
                            if (namea.toLowerCase() < nameb.toLowerCase()) return -1;
                            if (namea.toLowerCase() > nameb.toLowerCase()) return 1;
                            return 0;
                        });
                    });

                    $("#workspace-area").unblock();
                    $(".blockMsg").removeClass("search-block-element");
                    //console.log($scope.options.userState.longterm.workspaces);
                },
                function (xhr, status, error) {
                    console.log([xhr, status, error]);
                    $("#workspace-area").unblock();
                    $(".blockMsg").removeClass("search-block-element");
                });
        }
        catch (e) {
            //var trace = printStackTrace();
            //console.log(trace);

            if (e.message && e.name) {
                console.log(e.name + " : " + e.message);
            }
            else {
                console.log(e);
            }
        }
    };


    $scope.selectWorkspace = function(workspace_info) {
        if (workspace_info.length === 10) { //I don't think this case can ever happen
            console.log("Workspace info has length of 10 : " + workspace_info);
            $scope.options.userState.session.selectedWorkspaceName =
                workspace_info[9].narrative_nice_name;
            $scope.options.userState.session.selectedWorkspace = workspace_info[2];
        }
        else {
            $scope.options.userState.session.selectedWorkspaceName =
                workspace_info[8].narrative_nice_name;
            $scope.options.userState.session.selectedWorkspace = workspace_info[1];
        }

        angular.element(".workspace-chosen").removeClass("workspace-chosen");
        angular.element("#" + workspace_info[1].replace(":","_") + "_" + workspace_info[4]).addClass("workspace-chosen");

        $scope.options.objectsTransferred = 0;
        $scope.options.transferRequests = 0;
        $scope.options.transferSize = 0;
        $scope.options.duplicates = {};
        $scope.options.userState.session.displayWorkspaces = false;
    };


    $scope.copyGenome = function(n) {
        return $scope.workspace_service.get_object_info([{"name": $scope.options.userState.session.data_cart.data[n]["genome_id"], "workspace": $scope.options.userState.session.data_cart.data[n]["workspace_name"].split("Rich").join("")}])
            .fail(function (xhr, status, error) {
                console.log(xhr);
                console.log(status);
                console.log(error);
            })
            .done(function (info, status, xhr) {
                setTimeout(function() { ; }, 200);

                var max_tries = 10;
                var tries = 0;

                var copy_genome = function () {
                    $scope.workspace_service.copy_object({
                        "from": {
                                 "workspace": $scope.options.userState.session.data_cart.data[n]["workspace_name"].split("Rich").join(""),
                                 "name": info[0][1]
                                },
                        "to": {
                               "workspace": $scope.options.userState.session.selectedWorkspace,
                               "name": info[0][1]
                              }
                        }, success, error);
                };


                function success(result) {
                    $scope.$apply(function () {
                        $scope.options.objectsTransferred += 1;
                        $scope.options.duplicates[n] = {};
                        if ($scope.options.objectsTransferred === $scope.options.transferSize) {
                            $scope.completeTransfer();
                        }
                    });
                }

                function error(result) {
                    if (tries < max_tries) {
                        tries += 1;
                        console.log("Failed save, number of retries : " + (tries - 1));
                        copy_genome();
                    }
                    else {
                        console.log(xhr);
                        console.log(status);
                        console.log(error);
                        console.log(feature_obj);
                    }


                    console.log("Object failed to copy");
                    console.log(result);

                    $scope.transferError($scope.options.userState.session.data_cart.data[n]["object_name"],
                                         $scope.options.userState.session.data_cart.data[n]["object_id"],
                                         result);
                }

                $scope.options.transferRequests += 1;

                copy_genome();
            });

    };



    $scope.copyFeature = function(n) {
        //console.log($scope.options.userState.session.data_cart.data[n]["object_id"]);
        var split_id = $scope.options.userState.session.data_cart.data[n]["object_id"].split('/');
        //console.log("/features/" + split_id[2]);
        //console.log($scope.options.userState.session.data_cart.data[n]["genome_id"] + ".featureset");

        return $scope.workspace_service.get_object_subset([{"name": $scope.options.userState.session.data_cart.data[n]["genome_id"] + ".featureset",
                                                            "workspace": $scope.options.userState.session.data_cart.data[n]["workspace_name"].split("Rich").join(""),
                                                            "included": ["/features/" + split_id[2]]
                                                          }])
            .fail(function (xhr, status, error) {
                console.log(xhr);
                console.log(status);
                console.log(error);
            })
            .done(function (data, status, xhr) {
                setTimeout(function() { ; }, 100);

                $scope.options.transferRequests += 1;

                var feature_source_obj;
                var feature_dest_obj = {};

                try {
                    feature_source_obj = data[0].data.features[$scope.options.userState.session.data_cart.data[n]["feature_id"]].data;

                    for (var p in feature_source_obj) {
                        if (feature_source_obj.hasOwnProperty(p)) {
                            if (p === "feature_id") {
                                feature_dest_obj["id"] = angular.copy(feature_source_obj[p]);
                            }
                            else if (p === "feature_type") {
                                feature_dest_obj["type"] = angular.copy(feature_source_obj[p]);
                            }
                            else if (p === "location") {
                                var sortedOrdinals = feature_source_obj[p].sort(function (a,b) {
                                                          if (a[4] < b[4]) return -1;
                                                          if (a[4] > b[4]) return 1;
                                                          return 0;
                                                      });

                                feature_dest_obj[p] = [];
                                for (var i = sortedOrdinals.length - 1; i >= 0; i--) {
                                    feature_dest_obj[p].unshift(sortedOrdinals[i].slice(0,4));
                                }
                            }
                            else if (p === "aliases") {
                                feature_dest_obj[p] = [];
                                for (var k in feature_source_obj[p]) {
                                    if (feature_source_obj[p].hasOwnProperty(k)) {
                                        feature_dest_obj[p].push(k + ":" + feature_source_obj[p][k])
                                    }
                                }
                            }
                            else {
                                if (feature_source_obj[p]) {
                                    feature_dest_obj[p] = angular.copy(feature_source_obj[p]);
                                }
                            }
                        }
                    }
                    //console.log(feature_source_obj);
                    //console.log(feature_dest_obj);
                }
                catch (e) {
                    console.log(n);
                    console.log(e);
                }

                var max_tries = 10;
                var tries = 0;

                // wrap this in a function so that we can retry on failure
                var save_feature = function () {
                    $scope.workspace_service.save_objects({"workspace": $scope.options.userState.session.selectedWorkspace,
                                                           "objects": [{"data": feature_dest_obj,
                                                                        "type": "KBaseGenomes.Feature",
                                                                        "name": feature_source_obj["feature_id"],
                                                                        "provenance": [{"time": new Date().toISOString().split('.')[0] + "+0000",
                                                                                        "service": "KBase Search",
                                                                                        "description": "Created from a Public Genome Feature",
                                                                                        "input_ws_objects": []}],
                                                                        "meta": {}
                                                                       }]
                                                           })
                        .fail(function (xhr, status, error) {
                            if (tries < max_tries) {
                                tries += 1;
                                console.log("Failed save, number of retries : " + (tries - 1));
                                save_feature();
                            }
                            else {
                                console.log(xhr);
                                console.log(status);
                                console.log(error);
                                console.log(feature_dest_obj);
                                return error;
                            }
                        })
                        .done(function (info, status, xhr) {
                            console.log("Save successful, object info : " + info);
                            $scope.$apply(function () {
                                $scope.options.objectsTransferred += 1;
                                $scope.options.duplicates[n] = {};
                                if ($scope.options.objectsTransferred === $scope.options.transferSize) {
                                    $scope.completeTransfer();
                                }
                            });
                            return info;
                        });

                };

                // start the save
                save_feature();
            });
    };


    // grab a public object and make a copy to a user's workspace
    $scope.copyTypedObject = function(n, object_name, object_ref, from_workspace_name, to_workspace_name) {
        function success(result) {
            console.log("Object " + object_name + " copied successfully from " + from_workspace_name + " to " + to_workspace_name + " .");
            $scope.$apply(function () {
                $scope.options.objectsTransferred += 1;
                $scope.options.duplicates[n] = {};
                if ($scope.options.objectsTransferred === $scope.options.transferSize) {
                    $scope.completeTransfer();
                }
            });
        }

        function error(result) {
            console.log("Object " + object_name + " failed to copy from " + from_workspace_name + " to " + to_workspace_name + " .");
            console.log(result);
            $scope.transferError(object_name, object_ref, result);
        }

        $scope.options.transferRequests += 1;

        if (object_ref === undefined || object_ref === null) {
            console.log("no object ref for name " + object_name);
            return $scope.workspace_service.copy_object({"from": {"workspace": from_workspace_name, "name": object_name}, "to": {"workspace": to_workspace_name, "name": object_name}}, success, error);
        }
        else {
            console.log("had object ref " + object_ref);
            return $scope.workspace_service.copy_object({"from": {"ref": object_ref}, "to": {"workspace": to_workspace_name, "name": object_name}}, success, error);
        }
    };


    // grab all selected search results and copy those objects to the user's selected workspace
    $scope.addAllObjects = function() {
        if (!$scope.options.userState.session.selectedWorkspace) {
            console.log("select a Narrative first");
            return;
        }

        $scope.workspace_service = searchKBaseClientsService.getWorkspaceClient($scope.options.userState.session.token);

        var loop_requests = [];
        var max_simultaneous = 10;
        var ws_requests = [];
        var batches = 1;
        var types = {};

        $scope.options.transferSize = $scope.options.userState.session.transfer_cart.size;
        $scope.options.transferring = true;
        $scope.options.transferRequests = 0;

        //console.log($scope.options.userState.session.transfer_cart);

        var batchCopyRequests = function(ws_objects) {
            var ws_requests = [];

            for (var i = 0; i < ws_objects.length; i++) {
                if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseSearch.Genome") > -1) {
                    ws_requests.push($scope.copyGenome(ws_objects[i]).then(function () {;}));
                    if (!types.hasOwnProperty('genomes')) {
                        types['genomes'] = true;
                    }
                }
                else if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseSearch.Feature") > -1) {
                    ws_requests.push($scope.copyFeature(ws_objects[i]).then(function () {;}));
                    if (!types.hasOwnProperty('features')) {
                        types['features'] = true;
                    }
                }
                else if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("Communities.Metagenome") > -1) {
                    ws_requests.push($scope.copyMetagenome(ws_objects[i]).then(function () {;}));
                    if (!types.hasOwnProperty('metagenomes')) {
                        types['metagenomes'] = true;
                    }
                }
                else {
                    if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseFBA") > -1 ||
                        $scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseBiochem") > -1) {
                        if (!types.hasOwnProperty('models')) {
                            types['models'] = true;
                        }
                    }

                    if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseGwas") > -1) {
                        if (!types.hasOwnProperty('gwas')) {
                            types['gwas'] = true;
                        }
                    }

                    //generic solution for types
                    if ($scope.options.userState.session.data_cart.data[ws_objects[i]].hasOwnProperty("object_name") === true) {
                        //console.log($scope.options.userState.session.data_cart.data[ws_objects[i]]);
                        ws_requests.push($scope.copyTypedObject(
                                                ws_objects[i],
                                                $scope.options.userState.session.data_cart.data[ws_objects[i]]["object_name"],
                                                $scope.options.userState.session.data_cart.data[ws_objects[i]]["object_id"],
                                                $scope.options.userState.session.data_cart.data[ws_objects[i]]["workspace_name"],
                                                $scope.options.userState.session.selectedWorkspace).then(function () {;}));
                    }
                    else if ($scope.options.userState.session.data_cart.data[ws_objects[i]].hasOwnProperty("object_id") === true) {
                        console.log($scope.options.userState.session.data_cart.data[ws_objects[i]]);

                        $scope.workspace_service.get_object_info([{"name": $scope.options.userState.session.data_cart.data[ws_objects[i]]["object_id"], "workspace": $scope.options.userState.session.data_cart.data[ws_objects[i]]["workspace_name"]}])
                            .fail(function (xhr, status, error) {
                                console.log(xhr);
                                console.log(status);
                                console.log(error);
                            })
                            .done(function (info, status, xhr) {
                                ws_requests.push($scope.copyTypedObject(
                                                    ws_objects[i],
                                                    info[0][1],
                                                    $scope.options.userState.session.data_cart.data[ws_objects[i]]["object_id"],
                                                    $scope.options.userState.session.data_cart.data[ws_objects[i]]["workspace_name"],
                                                    $scope.options.userState.session.selectedWorkspace).then(function () {;}));
                            });
                    }
                    else {
                        // create error popover
                        console.log("no object reference found");
                        return;
                    }
                } // end type if else
            } // end for loop

            $q.all(ws_requests).then(function (result) {
                    $scope.workspace_service.get_workspace_info({"workspace": $scope.options.userState.session.selectedWorkspace}).then(
                        function (info) {
                            for (var i = $scope.options.userState.longterm.workspaces.length - 1; i >= 0; i--) {
                                if ($scope.options.userState.longterm.workspaces[i][1] === $scope.options.userState.session.selectedWorkspace) {
                                     $scope.$apply(function () {
                                         $scope.options.userState.longterm.workspaces[i][4] = info[4];
                                     });

                                     break;
                                }
                            }

                            //console.log([$scope.options.objectsTransferred, $scope.options.transferSize]);
                        },
                        function (error) {
                            console.log(error);
                        });

                    return result;
                },
                function (error) {
                    return error;
                });
        }; // end function

        // check for duplicates
        console.log("Copying objects...");

        for (var n in $scope.options.userState.session.data_cart.data) {
            if ($scope.options.userState.session.data_cart.data.hasOwnProperty(n)) {
                loop_requests.push(n);
            }

            if (loop_requests.length === max_simultaneous) {
                batchCopyRequests(loop_requests);
                loop_requests = [];
            }
        }

        if (loop_requests.length > 0) {
            batchCopyRequests(loop_requests);
            loop_requests = [];
        }

        //console.log(types);

        for (var t in types) {
            if (types.hasOwnProperty(t) && $scope.options.userState.session.data_cart.types[t].hasOwnProperty("all")) {
                $scope.options.userState.session.data_cart.types[t].all = false;
            }
            else if (types.hasOwnProperty(t) && $scope.options.userState.session.data_cart.types[t].hasOwnProperty("subtypes")) {
                for (var s in $scope.options.userState.session.data_cart.types[t].subtypes) {
                    if ($scope.options.userState.session.data_cart.types[t].subtypes.hasOwnProperty(s)) {
                        $scope.options.userState.session.data_cart.types[t].subtypes[s].all = false;
                    }
                }
            }
        }
    }; // end function


    // grab all selected search results and create a set referencing them in the user's selected workspace
    $scope.addSet = function() {
        if (!$scope.options.userState.session.selectedWorkspace) {
            console.log("select a Narrative first");
            return;
        }

        $scope.workspace_service = searchKBaseClientsService.getWorkspaceClient($scope.options.userState.session.token);

        var loop_requests = [];
        var max_simultaneous = 10;
        var ws_requests = [];
        var batches = 1;
        var types = {};

        $scope.options.transferSize = $scope.options.userState.session.transfer_cart.size;
        $scope.options.transferring = true;
        $scope.options.transferRequests = 0;

        //console.log($scope.options.userState.session.transfer_cart);

        // check for duplicates
        console.log("Copying objects...");

        if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseSearch.GenomeSet") > -1) {
            ws_requests.push($scope.copyGenomeSet(ws_objects[i]).then(function () {;}));
            if (!types.hasOwnProperty('genomes')) {
                types['genomes'] = true;
            }
        }
        else if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseSearch.FeatureSet") > -1) {
            ws_requests.push($scope.copyFeatureSet(ws_objects[i]).then(function () {;}));
            if (!types.hasOwnProperty('features')) {
                types['features'] = true;
            }
        }
        else if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("Communities.MetagenomeSet") > -1) {
            ws_requests.push($scope.copyMetagenomeSet(ws_objects[i]).then(function () {;}));
            if (!types.hasOwnProperty('metagenomes')) {
                types['metagenomes'] = true;
            }
        }
        else if ($scope.options.userState.session.data_cart.data[ws_objects[i]]["object_type"].indexOf("KBaseFBA.FBAModelSet") > -1) {
            ws_requests.push($scope.copyFBAModelSet(ws_objects[i]).then(function () {;}));
            if (!types.hasOwnProperty('models')) {
                types['models'] = true;
            }
        } // end type if else

        $q.all(ws_requests).then(function (result) {
                $scope.workspace_service.get_workspace_info({"workspace": $scope.options.userState.session.selectedWorkspace}).then(
                    function (info) {
                        for (var i = $scope.options.userState.longterm.workspaces.length - 1; i >= 0; i--) {
                            if ($scope.options.userState.longterm.workspaces[i][1] === $scope.options.userState.session.selectedWorkspace) {
                                 $scope.$apply(function () {
                                     $scope.options.userState.longterm.workspaces[i][4] = info[4];
                                 });

                                 break;
                            }
                        }

                        //console.log([$scope.options.objectsTransferred, $scope.options.transferSize]);
                    },
                    function (error) {
                        console.log(error);
                    });

                return result;
            },
            function (error) {
                return error;
            });

        //console.log(types);

        for (var t in types) {
            if (types.hasOwnProperty(t) && $scope.options.userState.session.data_cart.types[t].hasOwnProperty("all")) {
                $scope.options.userState.session.data_cart.types[t].all = false;
            }
            else if (types.hasOwnProperty(t) && $scope.options.userState.session.data_cart.types[t].hasOwnProperty("subtypes")) {
                for (var s in $scope.options.userState.session.data_cart.types[t].subtypes) {
                    if ($scope.options.userState.session.data_cart.types[t].subtypes.hasOwnProperty(s)) {
                        $scope.options.userState.session.data_cart.types[t].subtypes[s].all = false;
                    }
                }
            }
        }
    }; // end function




    $scope.copySet = function(type) {
        $scope.toggleAllDataCart(type);
        $scope.addSet(type);
        $scope.toggleAllDataCart();
        $scope.emptyTransfers();
    };


    $scope.copyData = function(type) {
        $scope.toggleAllDataCart(type);
        //$scope.hideTransferCartCheckboxes();
        $scope.addAllObjects(type);
        $scope.toggleAllDataCart();
        $scope.emptyTransfers();
    };

    $scope.hideTransferCartCheckboxes = function () {
        angular.element("input .search-data-cart-checkbox").addClass("hidden");
    };

    $scope.showTransferCartCheckboxes = function () {
        angular.element("input.search-data-cart-checkbox").removeClass("hidden");
    };

    $scope.completeTransfer = function() {
        if ($scope.options.transferSize === $scope.options.objectsTransferred) {
            $scope.options.transferring = false;
            $scope.showTransferCartCheckboxes();
        }
    };

    $scope.removeSelection = function(n) {
        if (n.object_type.indexOf(".Feature") > -1) {
            delete $scope.options.userState.session.data_cart.types['features'].markers[n.row_id];
            $scope.options.userState.session.data_cart.types['features'].size -= 1;
        }
        else {
            throw Error("Trying to delete unknown type!");
        }

        delete $scope.options.userState.session.data_cart.data[n.row_id];
        $scope.options.userState.session.data_cart.size -= 1;
    };

    $scope.emptyCart = function() {
        $scope.options.userState.session.selectAll = {};
        $scope.options.userState.session.data_cart = {
            all: false,
            size: 0,
            data: {},
            types: {
                'features': {all: false, size: 0, markers: {}}
            }
        };
    };

    $scope.emptyTransfers = function() {
        $scope.options.objectsTransferred = 0;

        $scope.saveUserState();
    };

    $scope.transferError = function(object_name, object_ref, result) {
        if (!$scope.options.userState.session.transferErrors) {
            $scope.options.userState.session.transferErrors = {};
        }
        $scope.options.userState.session.transferErrors[object_name] = {error: result};
    };

    $scope.toggleCheckbox = function(id, item) {
        if (!$scope.options.userState.session.data_cart.data.hasOwnProperty(id)) {
            $scope.selectCheckbox(id, item);
        }
        else {
            $scope.deselectCheckbox(id, item);
        }

        $scope.saveUserState();
    };

    $scope.selectCheckbox = function(id, item) {
        if (!$scope.options.userState.session.data_cart.data.hasOwnProperty(id)) {
            if (item.object_type.indexOf(".Feature") > -1) {
                $scope.options.userState.session.data_cart.size += 1;
                $scope.options.userState.session.data_cart.data[id] = {
                    "workspace_name": item.workspace_name,
                    "object_id": item.object_id,
                    "object_type": item.object_type,
                    "row_id": item.row_id,
                    "genome_id": item.genome_id,
                    "feature_id": item.feature_id,
                    "feature_source_id": item.feature_source_id,
                    "scientific_name": item.scientific_name,
                    "feature_type": item.feature_type,
                    "dna_sequence_length": item.dna_sequence_length,
                    "protein_translation_length": item.protein_translation_length,
                    "function": item.function,
                    "cart_selected": false
                };
                $scope.options.userState.session.data_cart.types['features'].markers[id] = {};
                $scope.options.userState.session.data_cart.types['features'].size += 1;
            }
            else {
                throw Error("Trying to add unknown type!");
            }
        }
    };

    $scope.deselectCheckbox = function(id, item) {
        if ($scope.options.userState.session.data_cart.data.hasOwnProperty(id)) {
            delete $scope.options.userState.session.data_cart.data[id];
            $scope.options.userState.session.data_cart.size -= 1;

            if (item.object_type.indexOf(".Feature") > -1) {
                delete $scope.options.userState.session.data_cart.types['features'].markers[id];
                $scope.options.userState.session.data_cart.types['features'].size -= 1;
            }
            else {
                throw Error("Trying to delete unknown type!");
            }
        }
    };


    $scope.toggleAll = function(items) {
        //console.log(items);

        var i;

        if ($scope.options.userState.session.selectAll.hasOwnProperty($scope.options.currentURL)) {
            if ($scope.options.userState.session.selectAll[$scope.options.currentURL].hasOwnProperty($scope.options.currentItemRange) && $scope.options.userState.session.selectAll[$scope.options.currentURL][$scope.options.currentItemRange]) {
                $scope.options.userState.session.selectAll[$scope.options.currentURL][$scope.options.currentItemRange] = false;

                for(i = items.length - 1; i > -1; i--) {
                    $scope.deselectCheckbox(items[i].row_id,items[i]);
                }

            }
            else {
                $scope.options.userState.session.selectAll[$scope.options.currentURL][$scope.options.currentItemRange] = true;

                for(i = items.length - 1; i > -1; i--) {
                    $scope.selectCheckbox(items[i].row_id,items[i]);
                }
            }
        }
        else {
            $scope.options.userState.session.selectAll[$scope.options.currentURL] = {};
            $scope.options.userState.session.selectAll[$scope.options.currentURL][$scope.options.currentItemRange] = true;

            for(i = items.length - 1; i > -1; i--) {
                $scope.selectCheckbox(items[i].row_id,items[i]);
            }
        }

        //console.log($scope.options.userState);
        $scope.saveUserState();
    };


    $scope.toggleAllDataCart = function(type) {
        console.log("toggleAllDataCart : " + type);

        var d;

        if (!type) {
            if ($scope.options.userState.session.data_cart.all) {
                for (d in $scope.options.userState.session.data_cart.data) {
                    if ($scope.options.userState.session.data_cart.data.hasOwnProperty(d)) {
                        $scope.options.userState.session.data_cart.data[d].cart_selected = true;
                    }
                }
                $scope.addSelectedToTransferCart();
                $scope.isCartInWorkspace();
            }
            else {
                for (d in $scope.options.userState.session.data_cart.data) {
                    if ($scope.options.userState.session.data_cart.data.hasOwnProperty(d)) {
                        $scope.options.userState.session.data_cart.data[d].cart_selected = false;
                    }
                }
                $scope.emptyTransferCart();
            }
        }
        else if ($scope.options.userState.session.data_cart.types.hasOwnProperty(type)) {
            if ($scope.options.userState.session.data_cart.types[type].all) {
                for (d in $scope.options.userState.session.data_cart.types[type].markers) {
                    if ($scope.options.userState.session.data_cart.types[type].markers.hasOwnProperty(d)) {
                        $scope.options.userState.session.data_cart.data[d].cart_selected = false;
                    }
                }
                $scope.emptyTransferCart();
            }
            else {
                for (d in $scope.options.userState.session.data_cart.types[type].markers) {
                    if ($scope.options.userState.session.data_cart.types[type].markers.hasOwnProperty(d)) {
                        $scope.options.userState.session.data_cart.data[d].cart_selected = true;
                    }
                }
                $scope.addSelectedToTransferCart();
                $scope.isCartInWorkspace();
            }
        }
        else {
            // look for subtypes
            for (var t in $scope.options.userState.session.data_cart.types) {
                if ($scope.options.userState.session.data_cart.types.hasOwnProperty(t) &&
                    $scope.options.userState.session.data_cart.types[t].hasOwnProperty("subtypes") &&
                    $scope.options.userState.session.data_cart.types[t].subtypes.hasOwnProperty(type)) {

                    if ($scope.options.userState.session.data_cart.types[t].subtypes[type].all) {
                        for (d in $scope.options.userState.session.data_cart.types[t].subtypes[type].markers) {
                            if ($scope.options.userState.session.data_cart.types[t].subtypes[type].markers.hasOwnProperty(d)) {
                                $scope.options.userState.session.data_cart.data[d].cart_selected = false;
                            }
                        }
                        $scope.emptyTransferCart();
                        return;
                    }
                    else {
                        for (d in $scope.options.userState.session.data_cart.types[t].subtypes[type].markers) {
                            if ($scope.options.userState.session.data_cart.types[t].subtypes[type].markers.hasOwnProperty(d)) {
                                $scope.options.userState.session.data_cart.data[d].cart_selected = true;
                            }
                        }
                        $scope.addSelectedToTransferCart();
                        $scope.isCartInWorkspace();
                        return;
                    }
                }
            }

            // if we fell through to this point the type specified was not found, throw an error
            throw Error("Unrecognized type : " + type);
        }
    };


    $scope.toggleInCart = function(id) {
        if(!$scope.options.userState.session.data_cart.data[id].cart_selected) {
            $scope.options.userState.session.data_cart.data[id].cart_selected = true;
            $scope.addToTransferCart(id);
            $scope.isObjectInWorkspace(id);
        }
        else {
            $scope.options.userState.session.data_cart.data[id].cart_selected = false;
            $scope.removeFromTransferCart(id);
        }
    };


    $scope.addSelectedToTransferCart = function() {
        for (var d in $scope.options.userState.session.data_cart.data) {
            if ($scope.options.userState.session.data_cart.data.hasOwnProperty(d) && $scope.options.userState.session.data_cart.data[d].cart_selected && !$scope.options.userState.session.transfer_cart.items.hasOwnProperty(d)) {
                $scope.addToTransferCart(d);
            }
        }
    };


    $scope.removeSelectedFromTransferCart = function() {
        for (var d in $scope.options.userState.session.data_cart.data) {
            if ($scope.options.userState.session.data_cart.data.hasOwnProperty(d) && $scope.options.userState.session.data_cart.data[d].cart_selected) {
                $scope.removeFromTransferCart(d);
            }
        }
    };


    $scope.addToTransferCart = function(id) {
        console.log("Adding to cart : " + id);

        if (!$scope.options.userState.session.transfer_cart.items.hasOwnProperty(id)) {
            $scope.options.userState.session.transfer_cart.items[id] = {};
            $scope.options.userState.session.transfer_cart.size += 1;
        }
    };

    $scope.removeFromTransferCart = function(id) {
        if ($scope.options.userState.session.transfer_cart.items.hasOwnProperty(id)) {
            delete $scope.options.userState.session.transfer_cart.items[id];
            $scope.options.userState.session.transfer_cart.size -= 1;
        }
    };


    $scope.emptyTransferCart = function() {
        $scope.options.userState.session.transfer_cart.items = {};
        $scope.options.userState.session.transfer_cart.size = 0;
    };

    $scope.removeCartSelected = function() {
        for (var d in $scope.options.userState.session.data_cart.data) {
            if ($scope.options.userState.session.data_cart.data.hasOwnProperty(d) && $scope.options.userState.session.data_cart.data[d].cart_selected) {
                //console.log(angular.element("#" + d.replace("|","_").replace(/\./g, "\\\.")));
                $scope.removeFromTransferCart(d);
                $scope.removeSelection($scope.options.userState.session.data_cart.data[d]);
                //angular.element("tr#" + d.replace("|","_").replace(/\./g, "\\\.")).remove();
            }
        }
    };


    $scope.getSearchbarTooltipText = function () {
        if ($scope.options.selectedCategory) {
            return "Type here to perform a search on " + $scope.options.searchCategories[$scope.options.selectedCategory].label + ".";
        }
        else {
            return "Type here to perform a search on all data categories.";
        }
    };


    $scope.isCartInWorkspace = function() {
        $scope.workspace_service = searchKBaseClientsService.getWorkspaceClient($scope.options.userState.session.token);

        var objects = [];
        var object_map = [];

        var i = 0;

        for (var d in $scope.options.userState.session.data_cart.data) {
            if ($scope.options.userState.session.data_cart.data[d].object_type.indexOf(".Genome") > -1) {
                objects.push({"workspace": $scope.options.userState.session.selectedWorkspace,
                              "name": $scope.options.userState.session.data_cart.data[d].genome_id});
            }
            else if ($scope.options.userState.session.data_cart.data[d].object_type.indexOf(".Feature") > -1) {
                objects.push({"workspace": $scope.options.userState.session.selectedWorkspace,
                              "name": $scope.options.userState.session.data_cart.data[d].feature_id});
            }
            else {
                objects.push({"workspace": $scope.options.userState.session.selectedWorkspace,
                              "name": $scope.options.userState.session.data_cart.data[d].object_name});
            }

            object_map[i] = d;
            i += 1;
        }

        return $scope.workspace_service.get_object_info_new({"objects": objects, "ignoreErrors": 1})
            .then(
            function (results) {
                $scope.$apply(function () {
                    for (var i = object_map.length - 1; i > -1; i--) {
                        if (results[i] !== null) {
                            $scope.options.duplicates[object_map[i]] = {};
                        }
                        else {
                            delete $scope.options.duplicates[object_map[i]];
                        }
                    }
                });
            },
            function (error) {
                console.log(error);
            });
    };




    $scope.isObjectInWorkspace = function(id) {
        $scope.workspace_service = searchKBaseClientsService.getWorkspaceClient($scope.options.userState.session.token);

        var checkObject;

        if ($scope.options.userState.session.data_cart.data[id].object_type.indexOf(".Genome") > -1) {
            checkObject = {"workspace": $scope.options.userState.session.selectedWorkspace,
                           "name": $scope.options.userState.session.data_cart.data[id].genome_id};
        }
        else if ($scope.options.userState.session.data_cart.data[id].object_type.indexOf(".Feature") > -1) {
            checkObject = {"workspace": $scope.options.userState.session.selectedWorkspace,
                           "name": $scope.options.userState.session.data_cart.data[id].feature_id};
        }
        else {
            checkObject = {"workspace": $scope.options.userState.session.selectedWorkspace,
                           "name": $scope.options.userState.session.data_cart.data[id].object_name};
        }

        return $scope.workspace_service.get_object_info_new({"objects": [checkObject], "ignoreErrors": 1}).then(
            function (results) {
                console.log(results);

                $scope.$apply(function () {
                    if (results[0] !== null) {
                        $scope.options.duplicates[id] = {};
                    }
                    else {
                        delete $scope.options.duplicates[id];
                    }
                });
            },
            function (error) {
                console.log(error);
            });
    };

});

