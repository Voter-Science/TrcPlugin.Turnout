// TypeScript
// JScript functions for BasicList.Html. 
// This calls TRC APIs and binds to specific HTML elements from the page.  

import * as trc from '../node_modules/trclib/trc2';
import * as html from '../node_modules/trclib/trchtml';
import * as trcFx from '../node_modules/trclib/trcfx';
import * as h from './helpers';
declare var $: any; // external definition for JQuery 

export class MyPlugin {
    private _sheet: trc.Sheet;
    private _options: trc.PluginOptionsHelper;

    // Entry point called from brower. 
    // This creates real browser objects and passes in. 
    public static BrowserEntry(
        sheet: trc.ISheetReference,
        opts: trc.IPluginOptions,
        next: (plugin: MyPlugin) => void
    ): void {
        var trcSheet = new trc.Sheet(sheet);
        var opts2 = trc.PluginOptionsHelper.New(opts, trcSheet);


        // Do any IO here...

        var plugin = new MyPlugin(trcSheet, opts2);
        next(plugin);
    }

    // Expose constructor directly for tests. They can pass in mock versions. 
    public constructor(
        sheet: trc.Sheet,
        opts2: trc.PluginOptionsHelper
    ) {
        this._sheet = sheet; // Save for when we do Post
        this._options = opts2;

        this.refresh2();
    }


    private refresh2() {
        this._sheet.getSheetContents(
            data => {
                this.makeCharts(data);
            }
        );
    }


    private makeCharts(data: trc.ISheetContents): void {

        var c1 = h.Helpers.getTotal(data);
        var r = new html.RenderSheet("xtotal", c1);
        r.render();       


        // "Supporter"
        var c1 = h.Helpers.makeHist(data, "Supporter", null);
        var r = new html.RenderSheet("xsupporter", c1);
        r.render();

        var c1 = h.Helpers.makeHist(data, "Party", {
            "1": "(1) Hard GOP",
            "2": "(2) Soft GOP",
            "3": "(3) Independent",
            "4": "(4) Soft Dem",
            "5": "(5) Hard Dem",
            "": "Unidentified"
        });
        var r = new html.RenderSheet("xparty", c1);
        r.render();

        var c1 = h.Helpers.makeHist(data, "XTargetPri",
            {
                "1": "Targeted voter",
                "": "Non targeted voter"
            });
        var r = new html.RenderSheet("xtarget", c1);
        r.render();

        var c1 = h.Helpers.makeHist(data, "ResultOfContact", null);
        var r = new html.RenderSheet("xcontact", c1);
        r.render();

        var c1 = h.Helpers.getSupportersThatNotVoted(data);
        var r = new html.RenderSheet("xs2", c1);
        r.setColumns(["RecId", "FirstName", "LastName", "PrecinctName"]);
        r.render();

        // "precinct"
        var c1 = h.Helpers.makeHist(data, "PrecinctName", null);
        var r = new html.RenderSheet("xprecinct", c1);
        r.render();
    }
}
