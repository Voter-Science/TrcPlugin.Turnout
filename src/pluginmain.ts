// TypeScript
// JScript functions for BasicList.Html. 
// This calls TRC APIs and binds to specific HTML elements from the page.  

import * as trc from 'trclib/trc2';
import * as html from 'trclib/trchtml';
import * as trcFx from 'trclib/trcfx';
import * as h from './helpers';
declare var $: any; // external definition for JQuery 

export class MyPlugin {
    private _sheet: trc.Sheet;
    private _options: trc.PluginOptionsHelper;

    // Target election date we show a report for.
    private _electionDate = new Date(2016, 7, 2); // Aug 2nd, 2016 

    // Entry point called from brower. 
    // This creates real browser objects and passes in. 
    public static BrowserEntry(
        sheet: trc.ISheetReference,
        opts: trc.IPluginOptions,
        next: (plugin: MyPlugin) => void
    ): void {
        var trcSheet = new trc.Sheet(sheet);
        var opts2 = trc.PluginOptionsHelper.New(opts, trcSheet);

        html.Loading("prebody2");

        // Do any IO here...

        var plugin = new MyPlugin(trcSheet, opts2, next);
        //next(plugin);
    }

    // Expose constructor directly for tests. They can pass in mock versions. 
    public constructor(
        sheet: trc.Sheet,
        opts2: trc.PluginOptionsHelper,
        next: (plugin: MyPlugin) => void
    ) {
        this._sheet = sheet; // Save for when we do Post
        this._options = opts2;

        this.refresh2(next);
    }

    private refresh2(  next: (plugin: MyPlugin) => void) {
        // $$$ cache this? 
        this._sheet.findVersion(this._electionDate, 
            (version : number ) => 
            {
                $("#date").html("This report is for <b>" + this._electionDate.toLocaleDateString() + "</b> and using canvassing results as of that time (version " + version + ")." );
                var version : number;
                this._sheet.getSheetContents(
                    data => {                        
                        this.makeCharts(data);

                        next(this);
                    }, undefined, undefined, undefined, version 
                );
            }, undefined);
    }


    private makeCharts(data: trc.ISheetContents): void {

        var c1 = h.Helpers.getTotal(data);
        var r = new html.RenderSheet("xtotal", c1);
        r.render();       


        // "Supporter"
        var xsupporter = h.Helpers.makeHist(data, "Supporter", null);
        var r = new html.RenderSheet("xsupporter", xsupporter);
        r.render();
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xsupporter-download"), () => {return xsupporter;});

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
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xparty-download"), () => {return xparty;});

        var xtarget = h.Helpers.makeHist(data, "XTargetPri",
            {
                "1": "Targeted voter",
                "": "Non targeted voter"
            });
        var r = new html.RenderSheet("xtarget", xtarget);
        r.render();
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xtarget-download"), () => {return xtarget;});

        var xcontact = h.Helpers.makeHist(data, "ResultOfContact", null);
        var r = new html.RenderSheet("xcontact", xcontact);
        r.render();
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xcontact-download"), () => {return xcontact;});

        var xs2 = h.Helpers.getSupportersThatNotVoted(data);
        var r = new html.RenderSheet("xs2", xs2);
        r.setColumns(["RecId", "FirstName", "LastName", "PrecinctName"]);
        r.render();
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xs2-download"), () => {return xs2;});

        // "precinct"
        var xprecinct = h.Helpers.makeHist(data, "PrecinctName", null);
        var r = new html.RenderSheet("xprecinct", xprecinct);
        r.render();
        html.DownloadHelper.appendDownloadCsvButton(document.getElementById("xprecinct-download"), () => {return xprecinct;});
        
        this.applyBootstrapStyling();
    }

    //TODO: remove if/when html helper renders elements with Bootstrap styles
    private applyBootstrapStyling():void {
        $("table").addClass("table table-striped");
        $("table").removeAttr("border");

        //TODO: convert td's in thead > tr's to th
    }
}
