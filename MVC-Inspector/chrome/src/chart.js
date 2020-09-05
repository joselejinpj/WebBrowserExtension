var pieChartcontentColors = ["#2484c1", "#0c6197", "#4daa4b", "#90c469", "#daca61",
                             "#e4a14b", "#e98125", "#cb2121", "#830909", "#923e99",
                             "#ae83d5", "#bf273e", "#ce2aeb", "#bca44a", "#618d1b",
                             "#1ee67b", "#b0ec44", "#a4a0c9", "#322849", "#86f71a",
                             "#d1c87f", "#7d9058", "#44b9b0", "#7c37c0", "#cc9fb1",
                             "#e65414", "#8b6834", "#248838"];

                             

function renderPieChart(json, divElement, title, height, width) { 
    var pie;
    var chartcontents = [];
    var pieChartcontentColorsIndex = 0;
    
    // Populate chartcontents
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            if(typeof json[key] === "number") {
                var chartcontent = {};
                
                chartcontent["label"] = key;
                chartcontent["value"] = json[key];
                if(pieChartcontentColorsIndex < pieChartcontentColors.length) {
                        chartcontent["color"] = pieChartcontentColors[pieChartcontentColorsIndex++];
                }
                
                chartcontents.push(chartcontent);
            } else {
                console.log("Input data invalid ! Cannot generate Pie Chart");
                return null;
            }
        }
    }
    
    pie = new d3pie(divElement, {
        "header": {
            "title": {
                "text": title,
                "fontSize": 15
            },
            "subtitle": {
                "text" : "",
                "color": "#999999",
                "fontSize": 12
            },
            "location": "top-left",
            "titleSubtitlePadding": 0
        },
        "footer": {
            "color": "#999999",
            "fontSize": 10,
            "location": "bottom-left"
        },
        "size": {
            "canvasHeight": height,
            "canvasWidth": width,
            "pieOuterRadius": "90%"         
        },
        "data": {
            "sortOrder": "value-desc",
            "smallSegmentGrouping": {
                "enabled": false
            },
            "content": chartcontents
        },
        "labels": {
            "outer": {
                "format": "label",
                "pieDistance": 30
            },
            "inner": {
                "hideWhenLessThanPercentage": 3
            },
            "mainLabel": {
                "fontSize": 10
            },
            "percentage": {
                "color": "#ffffff",
                "fontSize": 10,
                "decimalPlaces": 1
            },
            "value": {
                "color": "#adadad",
                "fontSize": 10
            },
            "lines": {
                "enabled": true
            },
            "truncation": {
                "enabled": true,
                "length": 10
            }           
        },
        "tooltips": {
            "enabled": true,
            "type": "placeholder",
            "string": "{label}: {value}, {percentage}%"
        },
        "effects": {
            "load": {
                "effect": "none"
            },
            "pullOutSegmentOnClick": {
                "effect": "linear",
                "speed": 400,
                "size": 8
            }
        },
        "misc": {
            "gradient": {
                "enabled": true,
                "percentage": 100
            },
            "canvasPadding": {
                "top": 0,
                "right": 5,
                "bottom": 0,
                "left": 0
            }
        }
    }); 
    
    return pie;
}
