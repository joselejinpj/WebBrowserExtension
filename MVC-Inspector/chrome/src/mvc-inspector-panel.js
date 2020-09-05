// Globals
var port;

var activeViews;
var pausedViews;
var destroyedViews;
var loadedViews;

var activeResources;
var loadedResources;

var logCount = 0;

// Constants
var events = {PAGE_LOADED : "PAGE_LOADED",
              ACTIVATE_VIEW : "ACTIVATE_VIEW",
              PAUSE_VIEW : "PAUSE_VIEW",
              DESTROY_VIEW : "DESTROY_VIEW",              
              AJAX_HANDLER_DISPATCH : "AJAX_HANDLER_DISPATCH"};

/*************** JS get executed in Inspected window context *******************/
function hackInspectedWindowFunction(funName, fun, code) {
    if(mvcFunctionsHackFinished) {
        return; // All hacking finished
    }
    
    var funString = fun.toString();
    var funArgs = funString.substring(funString.indexOf("(") + 1, funString.indexOf(")"));
    var funSrc = funString.substring(funString.indexOf("{") + 1, funString.lastIndexOf("}"));   
    var newFunSrc ="";  
    
    // Hack in the end of function
    newFunSrc = funSrc + ';\n' + code + '\n';       
    
    var newFunString = funName + "=function(" + funArgs + "){" + newFunSrc + "}";   
    eval(newFunString);
}

function checkStatus() {
    var status = 0;
    
    if(typeof(mvc) == 'undefined') {
        status = 1;
    }else if(typeof(mvc.get_debugger) == 'undefined') {
        status = 2;
    }
    
    return status;
}

function postMessageToMVCInspector(payload) {
     try {
        window.postMessage({ 'type': "MVC_APP", 'payload': JSON.parse(JSON.stringify(payload)) }, "*");
    } catch(e) {
        console.log(e.message);
    } 
}

function addMVCDebuggerEventHandler() {
    $(mvc.get_debugger()).bind(mvc.get_debugger().events.ACTIVATE_VIEW, function(event, view) {
        postMessageToMVCInspector({'event': mvc.get_debugger().events.ACTIVATE_VIEW, 'data' : {'d_name' : view.d_name}});
    });
    
    $(mvc.get_debugger()).bind(mvc.get_debugger().events.PAUSE_VIEW, function(event, view) {
        postMessageToMVCInspector({'event': mvc.get_debugger().events.PAUSE_VIEW, 'data' : {'d_name' : view.d_name}});
    });

    $(mvc.get_debugger()).bind(mvc.get_debugger().events.DESTROY_VIEW, function(event, view) {
        postMessageToMVCInspector({'event': mvc.get_debugger().events.DESTROY_VIEW, 'data' : {'d_name' : view.d_name}});
    });
    
    $(mvc.get_debugger()).bind(mvc.get_debugger().events.AJAX_HANDLER_DISPATCH, function(event, ajax_dispatch_data) {
        postMessageToMVCInspector({'event': mvc.get_debugger().events.AJAX_HANDLER_DISPATCH, 'data' : ajax_dispatch_data});
    }); 
}

function getView(key, data) {
    var clonedView = jQuery.extend(true, {}, mvc.get_debugger().get_view(key));
    delete clonedView._view_div; // Never send to inspector window
    
    try {
        return {'view' : JSON.parse(JSON.stringify(clonedView)), 'data' : data};
    } catch(e) {
        console.log(e.message);
        return {'view' : {'d_name' : clonedView.d_name, 'type' : clonedView.type, 'resource_name' : clonedView.resource_name, 'Inspector_Error' : {'message' : e.message}}, 'data' : data};
    }       
}

function getResource(key, data) {
    var clonedResource = jQuery.extend(true, {}, mvc.get_debugger().get_resource(key));
    
    try {
        return {'resource' : JSON.parse(JSON.stringify(clonedResource)), 'data' : data};
    } catch(e) {
        console.log(e.message);
        return {'resource' : {'name' : clonedResource.name, 'primary_keys' : clonedResource.primary_keys, 'get_url' : clonedResource.get_url, 'Inspector_Error' : {'message' : e.message}}, 'data' : data};
    }       
}

function getStatistics() {
    var clonedStatistics = jQuery.extend(true, {}, mvc.get_debugger().statistics);

    return {'statistics' : JSON.parse(JSON.stringify(clonedStatistics))};
}

function getActiveViews() {
    var ret = new Array();
    
    $.each(mvc.get_debugger().get_active_views(), function( key, value ) {
        ret.push(key);
    });
    
    return ret; 
}

function getPausedViews() {
    var ret = new Array();
    
    $.each(mvc.get_debugger().get_paused_views(), function( key, value ) {
        ret.push(key);
    });
    
    return ret;     
}

function getDestroyedViews() {
    var ret = new Array();
    
    $.each(mvc.get_debugger().get_destroyed_views(), function( key, value ) {
        ret.push(key);
    });
    
    return ret;     
}

function getLoadedViews() {
    var ret = new Array();
    
    $.each(mvc.get_debugger().get_loaded_views(), function( key, value ) {
        ret.push(key);
    });
    
    return ret;
}

function getActiveResources() {
    var ret = new Array();
    
    $.each(mvc.get_debugger().get_active_resources(), function( key, value ) {
        ret.push(key);
    });
    
    return ret;
}

function getLoadedResources() {
    var ret = new Array();
    
    $.each(mvc.get_debugger().get_loaded_resources(), function( key, value ) {
        ret.push(key);
    });
    
    return ret;
}

/*************** JS callbacks from Inspected window context ********************/
function dummyCb(result) {

}

function getStatisticsCb(jsonObj) {
    var statistics = jsonObj.statistics;
    if($('#loadedViewsDistributionGraph').attr('graphType') == "") { // Draw Views Distribution Graph only if not drawn
        $('#loadedViewsDistributionGraph').empty(); // Clear
        renderPieChart(statistics.views.distribution, 'loadedViewsDistributionGraph', '', 500, 600);
        $('#loadedViewsDistributionGraph').attr('graphType', 'PieChart');
        
        // Is this really needed ?
        // jsonFormatterRenderJson(statistics.views.distribution, $('#loadedViewsDistributionGraph')); 
    }   

    $('#viewsStatisticsLoadedViewsCount').text(statistics.views.loaded);    
    $('#viewsStatisticsActiveViewsCount').text(statistics.views.active);
    $('#viewsStatisticsPausedViewsCount').text(statistics.views.paused);
    $('#viewsStatisticsDestroyedViewsCount').text(statistics.views.destroyed);
    
    $('#resourcesStatisticsLoadedResourcesCount').text(statistics.resources.loaded);
    $('#viewsStatisticsActiveResourcesCount').text(statistics.resources.active);      

    $('#dataModelStatisticsGetDispatched').text(statistics.data_model.ajax_handler_dispatch.GET);
    $('#dataModelStatisticsPostDispatched').text(statistics.data_model.ajax_handler_dispatch.POST);     
    $('#dataModelStatisticsPutDispatched').text(statistics.data_model.ajax_handler_dispatch.PUT);   
    $('#dataModelStatisticsDeleteDispatched').text(statistics.data_model.ajax_handler_dispatch.DELETE);         
}

function getActiveViewsCb(views) {
    activeViews = views;
    
    $('#activeViewsSelectMenu').empty(); // Clear   
    
    if(activeViews.length > 0) {
        for (var i = (activeViews.length-1); i >= 0; i--) { // Put the last pushed one first
            $('#activeViewsSelectMenu').append($('<option>').text(activeViews[i]).attr('value', i));
        }

        $('#activeViewsSelectMenu').selectmenu({
            select: function() {
                executeOnInspectedWindow("getView('" + $('#activeViewsSelectMenu option:selected').text() + "','selectedActiveView')", getViewCb);
                highlightView();
            }
        }); 
        $('#activeViewsSelectMenu').selectmenu('refresh');
        // Get selected view
        if($('#activeViewsSelectMenu option:selected').val()) {
            executeOnInspectedWindow("getView('" + $('#activeViewsSelectMenu option:selected').text() + "','selectedActiveView')", getViewCb);
            highlightView();    
        }
    } else {
        $('#selectedActiveView').empty();
        $('#activeViewsSelectMenu').append($('<option>').text('None').attr('value', 0));
        $('#activeViewsSelectMenu').selectmenu('refresh');
    }   
}

function getPausedViewsCb(views) {
    pausedViews = views;
    
    $('#pausedViewsSelectMenu').empty(); // Clear
        
    if(pausedViews.length > 0) {
        for (var i = (pausedViews.length-1); i >= 0; i--) { // Put the last pushed one first
            $('#pausedViewsSelectMenu').append($('<option>').text(pausedViews[i]).attr('value', i));
        }

        $('#pausedViewsSelectMenu').selectmenu({
            select: function() {
                executeOnInspectedWindow("getView('" + $('#pausedViewsSelectMenu option:selected').text() + "','selectedPausedView')", getViewCb);
            }
        }); 
        $('#pausedViewsSelectMenu').selectmenu('refresh');
        // Get selected view
        if($('#pausedViewsSelectMenu option:selected').val()) {
            executeOnInspectedWindow("getView('" + $('#pausedViewsSelectMenu option:selected').text() + "','selectedPausedView')", getViewCb);
        }
    } else {
        $('#selectedPausedView').empty();
        $('#pausedViewsSelectMenu').append($('<option>').text('None').attr('value', 0));
        $('#pausedViewsSelectMenu').selectmenu('refresh');      
    }
}

function getDestroyedViewsCb(views) {
    destroyedViews = views;

    $('#destroyedViewsSelectMenu').empty(); // Clear
        
    if(destroyedViews.length > 0) {
        for (var i = (destroyedViews.length-1); i >= 0; i--) { // Put the last pushed one first
            $('#destroyedViewsSelectMenu').append($('<option>').text(destroyedViews[i]).attr('value', i));
        }

        $('#destroyedViewsSelectMenu').selectmenu({
            select: function() {
                executeOnInspectedWindow("getView('" + $('#destroyedViewsSelectMenu option:selected').text() + "','selectedDestroyedView')", getViewCb);
            }
        }); 
        $('#destroyedViewsSelectMenu').selectmenu('refresh');
        // Get selected view
        if($('#destroyedViewsSelectMenu option:selected').val()) {
            executeOnInspectedWindow("getView('" + $('#destroyedViewsSelectMenu option:selected').text() + "','selectedDestroyedView')", getViewCb);
        }
    } else {
        $('#selectedDestroyedView').empty();
        $('#destroyedViewsSelectMenu').append($('<option>').text('None').attr('value', 0));
        $('#destroyedViewsSelectMenu').selectmenu('refresh');           
    }
}

function getLoadedViewsCb(views) {
    loadedViews = views;
    
    loadedViews.sort(); // Sort for showing to user

    $('#loadedViewsSelectMenu').empty(); // Clear   
    
    if(loadedViews.length > 0) {
        for (var i = 0; i < loadedViews.length; i++) {
            $('#loadedViewsSelectMenu').append($('<option>').text(loadedViews[i]).attr('value', i));
        }

        $('#loadedViewsSelectMenu').selectmenu({
            select: function() {
                executeOnInspectedWindow("getView('" + $('#loadedViewsSelectMenu option:selected').text() + "','selectedLoadedView')", getViewCb);
            }
        }); 
        $('#loadedViewsSelectMenu').selectmenu('refresh');
        // Get selected view
        if($('#loadedViewsSelectMenu option:selected').val()) {
            executeOnInspectedWindow("getView('" + $('#loadedViewsSelectMenu option:selected').text() + "','selectedLoadedView')", getViewCb);
        }
    } else {
        $('#selectedLoadedView').empty();
        $('#loadedViewsSelectMenu').append($('<option>').text('None').attr('value', 0));
        $('#loadedViewsSelectMenu').selectmenu('refresh');          
    }
}

function getActiveResourcesCb(resources) {
    activeResources = resources;
    
    $('#activeResourcesSelectMenu').empty(); // Clear
        
    if(activeResources.length > 0) {
        for (var i = (activeResources.length-1); i>=0; i--) { // Put the last pushed one first
            $('#activeResourcesSelectMenu').append($('<option>').text(activeResources[i]).attr('value', i));
        }

        $('#activeResourcesSelectMenu').selectmenu({
            select: function() {
                executeOnInspectedWindow("getResource('" + $('#activeResourcesSelectMenu option:selected').text() + "','selectedActiveResource')", getResourceCb);
            }
        }); 
        $('#activeResourcesSelectMenu').selectmenu('refresh');
        // Get selected resource
        if($('#activeResourcesSelectMenu option:selected').val()) {
            executeOnInspectedWindow("getResource('" + $('#activeResourcesSelectMenu option:selected').text() + "','selectedActiveResource')", getResourceCb);
        }
    } else {
        $('#selectedActiveResource').empty();
        $('#activeResourcesSelectMenu').append($('<option>').text('None').attr('value', 0));
        $('#activeResourcesSelectMenu').selectmenu('refresh');          
    }
}

function getLoadedResourcesCb(resources) {
    loadedResources = resources;
    
    loadedResources.sort(); // Sort for showing to user

    $('#loadedResourcesSelectMenu').empty(); // Clear
    $('#querySystemLoadedResourcesSelectMenu').empty(); // Clear in Query System also
        
    if(loadedResources.length > 0) {
        for (var i = 0; i < loadedResources.length; i++) {
            $('#loadedResourcesSelectMenu').append($('<option>').text(loadedResources[i]).attr('value', i));
            $('#querySystemLoadedResourcesSelectMenu').append($('<option>').text(loadedResources[i]).attr('value', i)); // Fill in Query System also    
        }

        $('#loadedResourcesSelectMenu').selectmenu({
            select: function() {
                executeOnInspectedWindow("getResource('" + $('#loadedResourcesSelectMenu option:selected').text() + "','selectedLoadedResource')", getResourceCb);
            }
        }); 
        $('#loadedResourcesSelectMenu').selectmenu('refresh');
        
        // Get selected resource
        if($('#loadedResourcesSelectMenu option:selected').val()) {
            executeOnInspectedWindow("getResource('" + $('#loadedResourcesSelectMenu option:selected').text() + "','selectedLoadedResource')", getResourceCb);
        }
    } else {
        $('#selectedLoadedResource').empty();
        $('#loadedResourcesSelectMenu').append($('<option>').text('None').attr('value', 0));
        $('#loadedResourcesSelectMenu').selectmenu('refresh');     

        // Do same in Query System also
        $('#querySystemLoadedResourcesSelectMenu').append($('<option>').text('None').attr('value', 0));
    }
}

function checkStatusCb(status) {
    $('#error').empty();
    $('#error').hide(); 
    $('#main').hide();  
    
    if(status == 1) {
        $('#error').append("<h2>MVC not found on this page. Cannot inspect !</h2>");
        $('#error').show();
    } else if(status == 2) {
        $('#error').append("<h2>MVC exists, but MVC Debugger not found on this page. Cannot inspect !</h2>");
        $('#error').show();     
    } else {
        init();
    }
}

function getViewCb(jsonObj) {
    var view = jsonObj.view;
    var div = $('#' + jsonObj.data);
    
    if(typeof(view) !== 'undefined' && typeof(div) !== 'undefined') {
        var table = "<table style='width:100%'><tr class='highlightTr'>";

        div.empty(); // Clear
        
        if(view.hasOwnProperty('d_name')) {
            table += "<td style='width:20%'>" + "Name: <font color='#0B7500'>" + view['d_name'] + "</font></td>";
            delete view['d_name']; // No need to render in view JSON
        } else {
            table += "<td style='width:20%'>" + "Name: <font color='#FF0000'>" + "NONE" + "</font></td>";   
        }               
        if(view.hasOwnProperty('type')) {
            table += "<td style='width:20%'>" + "Type: <font color='#0B7500'>" + view['type'] + "</font></td>";
            delete view['type']; // No need to render in view JSON
        } else {
            table += "<td style='width:20%'>" + "Type: <font color='#FF0000'>" + "NONE" + "</font></td>";   
        }       
        if(view.hasOwnProperty('resource_name')) {
            table += "<td style='width:20%'>" + "Resource: <font color='#0B7500'>" + view['resource_name'] + "</font></td>";
            delete view['resource_name']; // No need to render in view JSON
        } else {
            table += "<td style='width:20%'>" + "Resource: <font color='#FF0000'>" + "NONE" + "</font></td>";   
        }
        if(view.hasOwnProperty('__tree_key')) {
            var treeKeysRenderString = (view['__tree_key']).split('^').join("<font color='#1A01CC'> -> </font>");
            table += "<td style='width:30%'>" + "Tree Key: <font color='#0B7500'>" + treeKeysRenderString + "</font></td>";
            delete view['__tree_key']; // No need to render in view JSON
        } else {
            // table += "<td style='width:30%'>" + "Tree Key: <font color='#FF0000'>" + "NONE" + "</font></td>"; // Ignore now
        }       
        
        table += "</tr></table>";

        $(div).append(table);
        
        if(view.hasOwnProperty('Inspector_Error')) {
            $(div).append(getInspectorErrorRenderer(view['Inspector_Error']));
        } else {
            jsonFormatterRenderJson(view, div); // Render JSON only if no error
        }  
    }
}

function getResourceCb(jsonObj) {
    var resource = jsonObj.resource;
    var div =  $('#' + jsonObj.data);
    
    if(typeof(resource) !== 'undefined' && typeof(div) !== 'undefined') {
        var table = "<table style='width:100%'><tr class='highlightTr'>";

        $(div).empty(); // Clear

        if(resource.hasOwnProperty('name')) {
            table += "<td style='width:20%'>" + "Name: <font color='#0B7500'>" + resource['name'] + "</font></td>";
            delete resource['name']; // No need to render in view JSON
        } else {
            table += "<td style='width:20%'>" + "Name: <font color='#FF0000'>" + "NONE" + "</font></td>";   
        }               
        if(resource.hasOwnProperty('primary_keys')) {
            table += "<td style='width:20%'>" + "Primary Keys: <font color='#0B7500'>" + resource['primary_keys'] + "</font></td>";
            delete resource['primary_keys']; // No need to render in view JSON
        } else {
            table += "<td style='width:20%'>" + "Primary Keys: <font color='#FF0000'>" + "NONE" + "</font></td>";   
        }
        if(resource.hasOwnProperty('get_url')) {
            table += "<td style='width:20%'>" + "Get URL: <font color='#0B7500'>" + resource['get_url'] + "</font></td>";
            delete resource['get_url']; // No need to render in view JSON
        } else {
            table += "<td style='width:20%'>" + "Get URL: <font color='#FF0000'>" + "NONE" + "</font></td>";    
        }   
        
        table += "</tr></table>";

        $(div).append(table);       
        
        if(resource.hasOwnProperty('Inspector_Error')) {
            $(div).append(getInspectorErrorRenderer(resource['Inspector_Error']));
        } else {
            jsonFormatterRenderJson(resource, div); // Render JSON only if no error
        }       
    }
}

/*************** JS get executed in Inspector window context *******************/
function highlightView() {
    if($('#activeViewsSelectMenu option:selected').val()) {
        var key = $('#activeViewsSelectMenu option:selected').text();

        if(document.getElementById("highlightActiveView").checked) {
            executeOnInspectedWindow("mvc.get_debugger().highlight_view('" + key + "', true)", dummyCb);             
        } else {
            executeOnInspectedWindow("mvc.get_debugger().highlight_view('" + key + "', false)", dummyCb);                    
        }
    }
}

function hackMVCFunctions() {
    /*** Add MVC functions to be hacked here ***/

    executeOnInspectedWindow("mvcFunctionsHackFinished = true;", dummyCb);  
}

function injectToInspectedWindow() {
    // Inject variables
    executeOnInspectedWindow("mvcExtnId ='" + chrome.runtime.id + "';", dummyCb);   

    // Inject functions
    executeOnInspectedWindow(hackInspectedWindowFunction.toString(), dummyCb);      
    executeOnInspectedWindow(postMessageToMVCInspector.toString(), dummyCb);
    executeOnInspectedWindow(addMVCDebuggerEventHandler.toString(), dummyCb);
    
    executeOnInspectedWindow(getView.toString(), dummyCb);
    executeOnInspectedWindow(getStatistics.toString(), dummyCb);    
    executeOnInspectedWindow(getActiveViews.toString(), dummyCb);   
    executeOnInspectedWindow(getPausedViews.toString(), dummyCb);
    executeOnInspectedWindow(getDestroyedViews.toString(), dummyCb);    
    executeOnInspectedWindow(getLoadedViews.toString(), dummyCb);   
    
    executeOnInspectedWindow(getResource.toString(), dummyCb);  
    executeOnInspectedWindow(getActiveResources.toString(), dummyCb);
    executeOnInspectedWindow(getLoadedResources.toString(), dummyCb);   
	
    executeOnInspectedWindow(getViewsForResource.toString(), dummyCb);  	
}

function executeOnInspectedWindow(instruction, resultCB) {
    chrome.devtools.inspectedWindow.eval(
        instruction,
        function(result, isException) {
            if (isException) {
                console.log("MVC Inspection failed ! [isError = " + isException.isError + "code = "  + isException.code + "value = " + isException.value + "]");
            } else {
                resultCB(result);
            }   
        }
    );
}

function updateDashboardTab() {
    if($("#mainTabs").tabs("option", "active") != 0) {
        return; // Updated only if active
    }
    
    executeOnInspectedWindow("getStatistics()", getStatisticsCb);
}

function updateActiveViewsTab() {
    if($("#mainTabs").tabs("option", "active") != 1) {
        return; // Updated only if active
    }
    
    executeOnInspectedWindow("getActiveViews()", getActiveViewsCb);
}

function updatePausedViewsTab() {
    if($("#mainTabs").tabs("option", "active") != 2) {
        return; // Updated only if active
    }
    
    executeOnInspectedWindow("getPausedViews()", getPausedViewsCb);
}

function updateDestroyedViewsTab() {
    if($("#mainTabs").tabs("option", "active") != 3) {
        return; // Updated only if active
    }
    
    executeOnInspectedWindow("getDestroyedViews()", getDestroyedViewsCb);
}

function updateLoadedViewsTab() {
    if($("#mainTabs").tabs("option", "active") != 4) {
        return; // Updated only if active
    }
    
    executeOnInspectedWindow("getLoadedViews()", getLoadedViewsCb);
}

function updateResourcesTab(flag) {
    if($("#mainTabs").tabs("option", "active") != 5) {
        return; // Updated only if active
    }
    
    if(flag) {
        executeOnInspectedWindow("getLoadedResources()", getLoadedResourcesCb);
    }
    
    executeOnInspectedWindow("getActiveResources()", getActiveResourcesCb); 
}

function updateQuerySystemTab() {
    if($("#mainTabs").tabs("option", "active") != 6) {
        return; // Updated only if active
    }
    
    if(loadedResources.length == 0) { // Need to update loadedResources only once   
        executeOnInspectedWindow("getLoadedResources()", getLoadedResourcesCb);
    }
}

function updateTabs() {
    updateActiveViewsTab();
    updatePausedViewsTab();
    updateDestroyedViewsTab();
    if(loadedViews.length == 0) { // Need to update loadedViews only once
        updateLoadedViewsTab();
    }
    if(loadedResources.length == 0) { // Need to update loadedResources only once   
        updateResourcesTab(true);
    } else {
        updateResourcesTab(false);
    }
    updateQuerySystemTab();
    updateDashboardTab();
}

function getInspectorErrorRenderer(inspectorError) {
    var inspectorErrorRenderer = "";
    
    if(inspectorError) {
        inspectorErrorRenderer = "<h3><font color='#FF0000'>Inspector Error. Failed to fetch data.</font></h3>";
        if(inspectorError.message) {
            inspectorErrorRenderer = inspectorErrorRenderer + "<p>Error: <font color='#9A0909'>" + inspectorError.message + "</font></p>";
        }
    }
    
    return inspectorErrorRenderer;
}

function checkSupport() {
    executeOnInspectedWindow(checkStatus.toString(), dummyCb);
    executeOnInspectedWindow("checkStatus()", checkStatusCb);
}

function init() {
    activeViews = [];
    pausedViews = [];
    destroyedViews = [];
    loadedViews = [];

    activeResources = [];
    loadedResources = [];

    injectToInspectedWindow();
    
    executeOnInspectedWindow("addMVCDebuggerEventHandler()", dummyCb);

    initInspectorUI();
    
    updateTabs();
}

function initInspectorUI() {
    $("#mainTabs").tabs();
    
    $( "#mainTabs" ).tabs({
      activate: function(event, ui) {updateTabs();}
    }); 
    
    $('#loadedViewsDistributionGraph').attr('graphType', '');
    
    $("#activeViewsSelectMenu").selectmenu();
    document.getElementById("highlightActiveView").onclick = function() {
        highlightView();
    }
    $("#pausedViewsSelectMenu").selectmenu();
    $("#destroyedViewsSelectMenu").selectmenu().selectmenu("menuWidget").addClass("overflowBig");       
    $("#loadedViewsSelectMenu").selectmenu().selectmenu("menuWidget").addClass("overflowBig");

    $( "#resourcesOptions" ).buttonset();
    $("input:radio[name='resourcesOptionsRadio']").click(function(){
        var id = $(this).attr("id");
        if(id == "activeResourcesRadio") {
            $("#loadedResourcesSelectMenu").selectmenu("widget").hide();
            $("#selectedLoadedResource").hide();
            $("#activeResourcesSelectMenu").selectmenu("widget").show();
            $("#selectedActiveResource").show();            
        } else if(id == "loadedResourcesRadio") {
            $("#activeResourcesSelectMenu").selectmenu("widget").hide();
            $("#selectedActiveResource").hide();                
            $("#loadedResourcesSelectMenu").selectmenu("widget").show();
            $("#selectedLoadedResource").show();
        }
    });
        
    $("#activeResourcesSelectMenu").selectmenu();
    $("#loadedResourcesSelectMenu").selectmenu().selectmenu("menuWidget").addClass("overflowBig");
    
    if(document.getElementById("activeResourcesRadio").checked) {
        $("#loadedResourcesSelectMenu").selectmenu("widget").hide();
        $("#selectedLoadedResource").hide();
        $("#activeResourcesSelectMenu").selectmenu("widget").show();
        $("#selectedActiveResource").show();
    } else if(document.getElementById("loadedResourcesRadio").checked) {
        $("#activeResourcesSelectMenu").selectmenu("widget").hide();
        $("#selectedActiveResource").hide();                
        $("#loadedResourcesSelectMenu").selectmenu("widget").show();
        $("#selectedLoadedResource").show();    
    }
    
    // $("#querySystemGetViewsForResourceButton").button();
    $("#querySystemGetViewsForResourceButton").click(function(){
		executeOnInspectedWindow("getViewsForResource('" + $('#querySystemLoadedResourcesSelectMenu option:selected').text() + "')", getViewsForResourceCb);
    });
    
    $( "#dataModelOptions" ).buttonset();
    $("input:radio[name='dataModelOptionsRadio']").click(function(){
        var id = $(this).attr("id");
        if(id == "getDataModelRadio") {
            $("#postDataModel").hide();
            $("#putDataModel").hide();
            $("#deleteDataModel").hide();           
            $("#getDataModel").show();            
        } else if(id == "postDataModelRadio") {
            $("#getDataModel").hide();
            $("#putDataModel").hide();
            $("#deleteDataModel").hide();           
            $("#postDataModel").show(); 
        } else if(id == "putDataModelRadio") {
            $("#getDataModel").hide();
            $("#postDataModel").hide();
            $("#deleteDataModel").hide();           
            $("#putDataModel").show(); 
        } else if(id == "deleteDataModelRadio") {
            $("#getDataModel").hide();
            $("#postDataModel").hide();
            $("#putDataModel").hide();          
            $("#deleteDataModel").show();
        }       
    }); 
    
    if(document.getElementById("getDataModelRadio").checked) {
        $("#postDataModel").hide();
        $("#putDataModel").hide();
        $("#deleteDataModel").hide();           
        $("#getDataModel").show(); 
    } else if(document.getElementById("postDataModelRadio").checked) {
        $("#getDataModel").hide();
        $("#putDataModel").hide();
        $("#deleteDataModel").hide();           
        $("#postDataModel").show();    
    } else if(document.getElementById("putDataModelRadio").checked) {
        $("#getDataModel").hide();
        $("#postDataModel").hide();
        $("#deleteDataModel").hide();           
        $("#putDataModel").show();     
    } else if(document.getElementById("deleteDataModelRadio").checked) {
        $("#getDataModel").hide();
        $("#postDataModel").hide();
        $("#putDataModel").hide();          
        $("#deleteDataModel").show();
    }
    
    $('#main').show();  
}

$(document).ready(function() {
    connectToInspector();
    
    // Check support first before starting MVC Inspector
    checkSupport();
});

/***************** Inspector messaging system *******************/
function connectToInspector() {
    port = chrome.runtime.connect({name:'MVC_PANEL'});
    if(typeof(port) !== 'undefined') {      
        port.onMessage.addListener(receiveMessageFromInspector);
    }   
}

function receiveMessageFromInspector(jsonMsg) {
    if(jsonMsg.event == events.PAGE_LOADED) {
        $('#logSelectMenuList').prepend($('<option>').text(getDateTime() + ' ' + 'Page Loaded').attr('value', logCount++).attr('style', 'color: #000000;')); // Log
        
        // Check support first before starting MVC Inspector
        checkSupport();
    }else if(jsonMsg.event == events.ACTIVATE_VIEW || jsonMsg.event == events.PAUSE_VIEW || jsonMsg.event == events.DESTROY_VIEW) {
        var viewName = 'unknown';
        var logText ='';
        if(typeof(jsonMsg.data) !== 'undefined') {
            viewName = jsonMsg.data.d_name;
        }
 
        if(jsonMsg.event == events.ACTIVATE_VIEW) {
            logText = getDateTime() + ' ' + 'Activated View ' + viewName;
            if($("#logSelectMenuList option:first").text() != logText) { // No need to capture multiple paths
                $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #219F0D;')); // Log     
            }
        }
        if(jsonMsg.event == events.PAUSE_VIEW) {
            logText = getDateTime() + ' ' + 'Paused View ' + viewName;
            if($("#logSelectMenuList option:first").text() != logText) { // No need to capture multiple paths
                $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #A1A127;')); // Log     
            }   
        }
        if(jsonMsg.event == events.DESTROY_VIEW) {
            logText = getDateTime() + ' ' + 'Destroyed View ' + viewName;
            if($("#logSelectMenuList option:first").text() != logText) { // No need to capture multiple paths
                $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #4B75B8;')); // Log     
            }   
        }
        
        updateActiveViewsTab();
        updatePausedViewsTab();
        updateDestroyedViewsTab();
        updateResourcesTab(false);  
        
        updateDashboardTab();
    }else if(jsonMsg.event == events.AJAX_HANDLER_DISPATCH) {
        var ajaxDispatchData = {'method' : 'unknown', 'url': 'unknown'};
        var logText ='';
        
        if(typeof(jsonMsg.data) !== 'undefined') {
            ajaxDispatchData = jsonMsg.data;
        }

        logText = getDateTime() + ' ' + 'Data Model dispatched - METHOD: ' + ajaxDispatchData.method + ' URL: ' + ajaxDispatchData.url;
                
        if(ajaxDispatchData.method == "GET") {
            $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #0017FF;')); // Log    

            $('#getDataModelSelectMenuList').prepend($('<option>').text(getDateTime() + ' - ' + ajaxDispatchData.url).attr('value', ajaxDispatchData.url).attr('style', 'color: #0017FF;'));   
        }else if(ajaxDispatchData.method == "POST") {
            $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #00009D;')); // Log  

            $('#postDataModelSelectMenuList').prepend($('<option>').text(getDateTime() + ' - ' + ajaxDispatchData.url).attr('value', ajaxDispatchData.url).attr('style', 'color: #00009D;'));               
        }else if(ajaxDispatchData.method == "PUT") {
            $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #78009D;')); // Log 

            $('#putDataModelSelectMenuList').prepend($('<option>').text(getDateTime() + ' - ' + ajaxDispatchData.url).attr('value', ajaxDispatchData.url).attr('style', 'color: #78009D;'));            
        }else if(ajaxDispatchData.method == "DELETE") {
            $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #B41010;')); // Log     
            
            $('#deleteDataModelSelectMenuList').prepend($('<option>').text(getDateTime() + ' - ' + ajaxDispatchData.url).attr('value', ajaxDispatchData.url).attr('style', 'color: #B41010;'));                         
        } else {
            $('#logSelectMenuList').prepend($('<option>').text(logText).attr('value', logCount++).attr('style', 'color: #000000;')); // Log  
        }
        
        updateDashboardTab();
    }
}

function sendMessageToInspector(jsonMsg) {
    if(typeof(port) !== 'undefined') {
        port.postMessage(jsonMsg);
    }
}   
