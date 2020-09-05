/*
 * MVC Debugger
 */
if(typeof(mvc) !== 'undefined') 
{
    mvc._debugger = new function()
    {
        var _rd;
        
        var _loaded_views = {};
        var _active_views = {};
        var _paused_views = {};
        var _destroyed_views = {};
        var _loaded_resources = {};    
        var _active_resources = {}; 
        var _highlighted_element = null;

        this.events = {};
        this.statistics = {};
        this.query_system = {};
        
        this.init = function()
        {
            _rd = this;
            
            _init_events();
            _init_statistics();
            _init_query_system();
            
            _add_debug_info_to_views();
            _add_debug_info_to_resources();
        };

        this.get_view = function(key)
        {
            return _loaded_views[key];
        }

        this.get_active_views = function()
        {
            return _active_views;
        };

        this.get_paused_views = function()
        {
            return _paused_views;
        };

        this.get_destroyed_views = function()
        {
            return _destroyed_views;
        };

        this.get_loaded_views = function()
        {
            return _loaded_views;
        };
        
        this.get_resource = function(key)
        {
            return _loaded_resources[key];
        }

        this.get_active_resources = function()
        {
            var key;

            _active_resources = {};

            $.each(_active_views, function(key, value)
            {
                key = value.resource_name;
                if(mvc.utils.is_defined(key))
                    _active_resources[key] = _loaded_resources[key];
            });        

            return _active_resources;
        };  

        this.get_loaded_resources = function()
        {
            return _loaded_resources;
        };    

        this.activate_view = function(view_definition, view_div)
        {
            var key = view_definition.d_name;

            view_definition._view_div = view_div; // Cache container 

            if(mvc.utils.is_defined(key))
            {    
                if(_active_views.hasOwnProperty(key))
                    delete _active_views[key]; // Clear existing one

                _active_views[key] = view_definition; // Add to the end

                // Clear from _paused_views, _destroyed_views
                if(_paused_views.hasOwnProperty(key))
                    delete _paused_views[key];        

                if(_destroyed_views.hasOwnProperty(key))
                    delete _destroyed_views[key];
            }
            
            // Update statistics
            this.statistics.views.active = Object.keys(_active_views).length;
            this.statistics.views.paused = Object.keys(_paused_views).length;
            this.statistics.views.destroyed = Object.keys(_destroyed_views).length; 
            this.statistics.resources.active = Object.keys(this.get_active_resources()).length;
            
            $(this).trigger(this.events.ACTIVATE_VIEW, view_definition);                  
        };

        this.pause_view = function(view_definition)
        {
            var key = view_definition.d_name;

            if(mvc.utils.is_defined(key))
            {  
                if(_paused_views.hasOwnProperty(key))
                    delete _paused_views[key]; // Clear existing one

                _paused_views[key] = view_definition; // Add to the end

                // Clear from _active_views, _destroyed_views
                if(_active_views.hasOwnProperty(key))
                    delete _active_views[key];        

                if(_destroyed_views.hasOwnProperty(key))
                    delete _destroyed_views[key]; 
            }
            
            // Update statistics
            this.statistics.views.active = Object.keys(_active_views).length;
            this.statistics.views.paused = Object.keys(_paused_views).length;
            this.statistics.views.destroyed = Object.keys(_destroyed_views).length; 
            this.statistics.resources.active = Object.keys(this.get_active_resources()).length;         

            $(this).trigger(this.events.PAUSE_VIEW, view_definition);             
        };

        this.destroy_view = function(view_definition)
        {
            var key = view_definition.d_name;

            if(view_definition.hasOwnProperty('_view_div'))
                delete view_definition['_view_div']; // Clear container

            if(mvc.utils.is_defined(key))
            {  
                if(_destroyed_views.hasOwnProperty(key))
                    delete _destroyed_views[key]; // Clear existing one

                _destroyed_views[key] = view_definition; // Add to the end

                // Clear from _active_views, _paused_views
                if(_active_views.hasOwnProperty(key))
                    delete _active_views[key];        

                if(_paused_views.hasOwnProperty(key))
                    delete _paused_views[key]; 
            }  

            // Update statistics
            this.statistics.views.active = Object.keys(_active_views).length;
            this.statistics.views.paused = Object.keys(_paused_views).length;
            this.statistics.views.destroyed = Object.keys(_destroyed_views).length; 
            this.statistics.resources.active = Object.keys(this.get_active_resources()).length;         
            
            $(this).trigger(this.events.DESTROY_VIEW, view_definition);              
        };

        this.ajax_handler_dispatch = function(ajax_dispatch_data)
        {
            // Update statistics
            if(ajax_dispatch_data.method == "GET")
                this.statistics.data_model.ajax_handler_dispatch.GET++;
            if(ajax_dispatch_data.method == "POST")
                this.statistics.data_model.ajax_handler_dispatch.POST++;
            if(ajax_dispatch_data.method == "PUT")
                this.statistics.data_model.ajax_handler_dispatch.PUT++;
            if(ajax_dispatch_data.method == "DELETE")
                this.statistics.data_model.ajax_handler_dispatch.DELETE++;              
            
            $(this).trigger(this.events.AJAX_HANDLER_DISPATCH, ajax_dispatch_data);         
        };
        
        this.highlight_view = function(key, flag) 
        {
            // Applicable ONLY to active views
            if(_active_views.hasOwnProperty(key))
            {
                var view = _active_views[key];
                if(view.hasOwnProperty('_view_div') && view['_view_div'])
                {
                    if(_highlighted_element)
                    {
                        _highlighted_element.removeClass('mvc_debugger_highlight'); // Highlight only one at a time
                        _highlighted_element = null;
                    }
                    
                    if(flag)
                    {
                        _highlighted_element = view['_view_div'];
                        _highlighted_element.addClass('mvc_debugger_highlight');
                    }
                }
            }
        }
        
        function _add_debug_info_to_views()
        {
            if(mvc.views)
            {
                $.each(mvc.views, function(key, value)
                {
                    // Add debug info needed
                    value.d_name = key;

                    // Populate _loaded_views
                    _loaded_views[key] = value;
                    
                    // Populate _loaded_views distribution statistics
                    if(value.hasOwnProperty('type'))
                    {
                        if(_rd.statistics.views.distribution.hasOwnProperty(value['type']))
                            _rd.statistics.views.distribution[value['type']]++;
                        else
                            _rd.statistics.views.distribution[value['type']] = 1; // First one
                    }
                    else
                    {
                        if(_rd.statistics.views.distribution.hasOwnProperty('OTHER_VIEW'))
                            _rd.statistics.views.distribution['OTHER_VIEW']++;
                        else
                            _rd.statistics.views.distribution['OTHER_VIEW'] = 1; // First one                   
                    }
                });
                
                _rd.statistics.views.loaded = Object.keys(_loaded_views).length;
            }    
        };

        function _add_debug_info_to_resources()
        {
            if(mvc.resources)
            {
                $.each(mvc.resources, function(key, value)
                {
                    // Add debug info needed
                    // TODO    

                    // Populate _loaded_resources
                    _loaded_resources[key] = value;
                });
                
                _rd.statistics.resources.loaded = Object.keys(_loaded_resources).length;
            }    
        };    

        function _init_events()
        {
            _rd.events.ACTIVATE_VIEW = "ACTIVATE_VIEW";
            _rd.events.PAUSE_VIEW = "PAUSE_VIEW";
            _rd.events.DESTROY_VIEW = "DESTROY_VIEW"; 
            _rd.events.AJAX_HANDLER_DISPATCH = "AJAX_HANDLER_DISPATCH";         
        };
        
        function _init_statistics()
        {
            _rd.statistics.views = {};
            _rd.statistics.views.distribution = {};
            _rd.statistics.views.loaded = 0;            
            _rd.statistics.views.active = 0;
            _rd.statistics.views.paused = 0;
            _rd.statistics.views.destroyed = 0;
            
            _rd.statistics.resources = {};
            _rd.statistics.resources.loaded = 0;
            _rd.statistics.resources.active = 0;

            _rd.statistics.data_model = {};
            _rd.statistics.data_model.ajax_handler_dispatch = {};
            _rd.statistics.data_model.ajax_handler_dispatch.GET = 0;
            _rd.statistics.data_model.ajax_handler_dispatch.POST = 0;
            _rd.statistics.data_model.ajax_handler_dispatch.PUT = 0;
            _rd.statistics.data_model.ajax_handler_dispatch.DELETE = 0;
        };

        function _init_query_system()
        {
            _rd.query_system.get_views_for_resource = function(resource_key) 
            {
                var qResult = {};
                
				$.each(_loaded_views, function(key, value)
				{
					if(value.hasOwnProperty('resource_name'))
					{
						if(value['resource_name'] == resource_key)
						{
							qResult[key] = value;
						}
					}
				});
                
                return qResult;
            }

        };          
    };
    
    mvc.get_debugger = function()
    {
        return mvc._debugger;
    };

    
    mvc.get_debugger().init();
}   
