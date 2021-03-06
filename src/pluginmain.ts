// TypeScript
// JScript functions for BasicList.Html. 
// This calls TRC APIs and binds to specific HTML elements from the page.  

import * as trc from 'trclib/trc2';
import * as html from 'trclib/trchtml';
import * as trcFx from 'trclib/trcfx';
import * as h from './helpers';
import * as turnoutchart from './turnoutchart';
declare var $: any; // external definition for JQuery 
declare var google: any;
declare var HeatmapOverlay: any;

export class MyPlugin {
    private _sheet: trc.Sheet;
    private _options: trc.PluginOptionsHelper;
    private _opts: trc.IPluginOptions;

    // Target election date we show a report for.
    private _electionDate = new Date(2017, 11 - 1, 7); // Aug 2nd, 2016 

    // Scan for all <a> with "plugin" class and make into link. 
    // <a class="plugin">{PluginId}</a>
    private applyAllPlugins(): void {
        $("a.plugin").each((idx : any, e : any) => {
            // Text is the 
            var pluginId: string = e.innerText;
            var url = this.getGotoLinkForPlugin(pluginId);
            $(e)
                .attr("href", this.getGotoLinkForPlugin(pluginId))
                .attr("target", "_blank");
        });
    }

    // Where <a id="gotoListView" target="_blank">text</a>
    // $("#gotoListView").attr("href", this.getGotoLinkForPlugin("ListView"));
    private getGotoLinkForPlugin(pluginId: string): string {
        if (this._opts == undefined) {
            return "/"; // avoid a crash
        }
        return this._opts.gotoUrl + "/" + this._sheet.getId() + "/" +
            pluginId + "/index.html";
    }


    // Entry point called from brower. 
    // This creates real browser objects and passes in. 
    public static BrowserEntry(
        sheet: trc.ISheetReference,
        opts: trc.IPluginOptions,
        next: (plugin: MyPlugin) => void
    ): void {
        var trcSheet = new trc.Sheet(sheet);
        

        html.Loading("prebody2");
        
        // Do any IO here...

        var plugin = new MyPlugin(trcSheet, opts, next);
        //next(plugin);
    }

    // Expose constructor directly for tests. They can pass in mock versions. 
    public constructor(
        sheet: trc.Sheet,
        opts: trc.IPluginOptions,
        next: (plugin: MyPlugin) => void
    ) {
        this._opts = opts;
        this._sheet = sheet; // Save for when we do Post
        this._options = trc.PluginOptionsHelper.New(opts, sheet);;

        this.refresh2(next);
    }

    private refresh2(next: (plugin: MyPlugin) => void) {
        this.applyAllPlugins();
        this._sheet.getSheetContents(
            data => {
                if (data["XVoted"] == undefined) {
                    alert("There is no voter-turnout information in this sheet. (It's missing an 'XVoted' column).");
                }
                this.makeCharts(data);

                next(this);
            });

        /*
        // $$$ cache this? 
        this._sheet.findVersion(this._electionDate,
            (version: number) => {
                $("#date").html("This report is for <b>" + this._electionDate.toLocaleDateString() + "</b> and using canvassing results as of that time (version " + version + ").");
                var version: number;
                this._sheet.getSheetContents(
                    data => {
                        this.makeCharts(data);

                        next(this);
                    }, undefined, undefined, undefined, version
                );
            }, undefined);
            */
    }


    private makeCharts(data: trc.ISheetContents): void {

        var c1 = h.Helpers.getTotal(data); // total voted 

        turnoutchart.TurnoutChart.work(data, parseInt(c1["Voted"][0]));

        var r = new html.RenderSheet("xtotal", c1);
        r.render();
        if (data["Supporter"] != undefined) {
            // "Supporter"
            var xsupporter = h.Helpers.makeHist(data, "Supporter", null);
            var r = new html.RenderSheet("xsupporter", xsupporter);
            r.render();
            html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xsupporter-download"), () => { return xsupporter; });

            var xs2 = h.Helpers.getSupportersThatNotVoted(data);
            var r = new html.RenderSheet("xs2", xs2);
            r.setColumns(["RecId", "FirstName", "LastName", "PrecinctName"]);
            r.render();
            html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xs2-download"), () => { return xs2; });
    
        } else {
            $('#xsupporter').append($('<p>[No supporter column set]</p>'));
        }

        var xparty = h.Helpers.makeHist(data, "Party", {
            "1": "(1) Hard GOP",
            "2": "(2) Soft GOP",
            "3": "(3) Independent",
            "4": "(4) Soft Dem",
            "5": "(5) Hard Dem",
            "": "Unidentified"
        });
        var r = new html.RenderSheet("xparty", xparty);
        r.render();
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xparty-download"), () => { return xparty; });


        if (data["XTargetPri"] != undefined) {
            var xtarget = h.Helpers.makeHist(data, "XTargetPri",
                {
                    "1": "Targeted voter",
                    "": "Non targeted voter"
                });
            var r = new html.RenderSheet("xtarget", xtarget);
            r.render();
            html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xtarget-download"), () => { return xtarget; });
        } else {
            $('#xtarget').append($('<p>[No targets set]</p>'));
        }

        if (data["ResultOfContact"] != undefined) 
        {
            var xcontact = h.Helpers.makeHist(data, "ResultOfContact", null);
            var r = new html.RenderSheet("xcontact", xcontact);
            r.render();
            html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xcontact-download"), () => { return xcontact; });
        } else {
            $('#xcontact').append($('<p>[No ResultOfContact set]</p>'));
        }


        // "precinct"
        if (data["PrecinctName"] != undefined) 
        {
            var xprecinct = h.Helpers.makeHist(data, "PrecinctName", null);
            var r = new html.RenderSheet("xprecinct", xprecinct);
            r.render();
            html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xprecinct-download"), () => { return xprecinct; });
            }
            else {
                $('#xprecinct').append($('<p>[No PrecinctName set]</p>'));
            }

        this.applyBootstrapStyling();

        if (data["Party"] != undefined) {            
            var party1 = this.getHeatmapData(data, "Party", "1");
            this.createHeatmap(party1, "party-1-heatmap");

            var party5 = this.getHeatmapData(data, "Party", "5");
            this.createHeatmap(party5, "party-5-heatmap");
        }

        var xvoted1 = this.getHeatmapData(data, "XVoted", "1");
        this.createHeatmap(xvoted1, "xvoted-1-heatmap");
    }

    private getHeatmapData(source: trc.ISheetContents, filterColumnName?: string, filterColumnValue?: any): any {
        let count = source["Lat"].length;

        console.log(source);

        var dic: any = {};

        var max: number = 0;

        for (let i: number = 0; i < count; i++) {

            if (filterColumnName) {
                if (source[filterColumnName][i] != filterColumnValue) continue;
            }

            let lat = source["Lat"][i];
            let lng = source["Long"][i];

            let key = "".concat(lat, lng);
            if (!key) continue;

            if (!dic[key]) {
                dic[key] = { lat: lat, lng: lng, count: 1 }
            }
            else {
                dic[key]["count"]++;
                if (dic[key]["count"] > max) { max = dic[key]["count"]; }
            }
        }

        var keys = Object.keys(dic);
        let dataArray = new Array();

        keys.forEach(key => {
            dataArray.push(dic[key]);
        });

        return { max: max, data: dataArray };
    }

    private createHeatmap(data: any, containerId: string): void {
        if (data.data.length == 0)
        {
            return;
        }
        // don't forget to add gmaps-heatmap.js
        //var myLatlng = new google.maps.LatLng(25.6586, -80.3568);
        var myLatlng = new google.maps.LatLng(data.data[0].lat, data.data[0].lng);
        // map options,
        var myOptions = {
            zoom: 14,
            center: myLatlng
        };
        // standard map
        var map = new google.maps.Map(document.getElementById(containerId), myOptions);
        // heatmap layer
        var heatmap = new HeatmapOverlay(map,
            {
                // radius should be small ONLY if scaleRadius is true (or small radius is intended)
                "radius": 10,
                "maxOpacity": .5,
                // scales the radius based on map zoom
                "scaleRadius": false,
                // if set to false the heatmap uses the global maximum for colorization
                // if activated: uses the data maximum within the current map boundaries 
                //   (there will always be a red spot with useLocalExtremas true)
                "useLocalExtrema": true,
                // which field name in your data represents the latitude - default "lat"
                latField: 'lat',
                // which field name in your data represents the longitude - default "lng"
                lngField: 'lng',
                // which field name in your data represents the data value - default "value"
                valueField: 'count'
            }
        );

        heatmap.setData(data);
    }

    //TODO: remove if/when html helper renders elements with Bootstrap styles
    private applyBootstrapStyling(): void {
        $("table").addClass("table table-striped");
        $("table").removeAttr("border");

        //TODO: convert td's in thead > tr's to th
    }
}
