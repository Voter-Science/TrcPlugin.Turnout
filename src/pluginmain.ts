// TypeScript
// JScript functions for BasicList.Html. 
// This calls TRC APIs and binds to specific HTML elements from the page.  

import * as trc from '../node_modules/trclib/trc2';
import * as html from '../node_modules/trclib/trchtml';
import * as trcFx from '../node_modules/trclib/trcfx';

declare var $: any; // external definition for JQuery 

class Helpers {
    private static isTrue(val: string): boolean {
        if ((val == "1") || (val.toLowerCase() == "yes")) {
            return true;
        }
        return false;
    }

    // return a string of (a/b) as a percent. 
    public static Per(a: number, b: number): string {
        if (b == 0) {
            return "--";
        }
        return (a * 100 / b).toFixed(1) + "%";
    }

    public static getSupportersThatNotVoted(
        data: trc.ISheetContents): trc.ISheetContents {
        var cVoted: string[] = data["XVoted"];
        var cSupporter: string[] = data["Supporter"];

        var x = trc.SheetContents.KeepRows(
            data, (iRow) =>
                Helpers.isTrue(cSupporter[iRow]) &&
                !Helpers.isTrue(cVoted[iRow])
        );
        return x;
    }

    public static getTotal(
        data : trc.ISheetContents) : trc.ISheetContents
    {
        var cVoted: string[] = data["XVoted"];
        
        var grandTotal = 0;
        var grandTotalVoted = 0;


        // Count them
        for (var iRow = 0; iRow < cVoted.length; iRow++) {
            grandTotal++;            
            if (Helpers.isTrue(cVoted[iRow])) {                
                grandTotalVoted++;
            }            
        }     

        var x : trc.ISheetContents = {};
        x["Total"] = [grandTotal.toString()];
        x["Voted"] = [grandTotalVoted.toString()];
        x["Turnout%"] = [Helpers.Per(grandTotalVoted, grandTotal)];
        return x;       
    }

    // Make a histogram pivoted on columnName, with counts for "Total" and "Voted"
    // data - raw sheet
    // columnName - column to pivot on. 
    // labels - optional mapping to provide friendly names
    public static makeHist(
        data: trc.ISheetContents,
        columnName: string,
        labels: { [key: string]: string; }): trc.ISheetContents {

        var c: string[] = data[columnName];

        var cVoted: string[] = data["XVoted"];

        var d: any = {};

        var grandTotalVoted = 0;
        // Count them
        for (var iRow = 0; iRow < c.length; iRow++) {
            var key: string = c[iRow];

            var entry = d[key];
            if (entry == undefined) {
                entry = [0, 0];
            }
            entry[0]++;
            if (Helpers.isTrue(cVoted[iRow])) {
                entry[1]++;
                grandTotalVoted++;
            }
            d[key] = entry;
        }

        // Convert to a sheet 

        var result: trc.ISheetContents = {};
        var cValue: string[] = [];
        var cTotal: string[] = [];
        var cVoted: string[] = [];
        var cPercentVoted: string[] = [];
        var cPercentOfTotal: string[] = [];
        var cPercentOfVoted: string[] = [];

        result[columnName] = cValue;
        result["Total"] = cTotal;
        result["Voted"] = cVoted;
        result["Turnout%"] = cPercentVoted;
        result["PercentOfTotal"] = cPercentOfTotal;
        result["PercentOfVoted"] = cPercentOfVoted;

        for (var key in d) {
            var entry = d[key];
            var label = key;
            if (key == "0") {
                key = "";
            }

            if (labels != null) {
                var x = labels[key];
                if (x != undefined) {
                    label = x;
                }
            }

            cValue.push(label);

            var total = entry[0];
            var voted = entry[1];
            cTotal.push(total);
            cVoted.push(voted);

            var p = Helpers.Per(voted, total);
            cPercentVoted.push(p);

            var p = Helpers.Per(total, c.length);
            cPercentOfTotal.push(p);

            var p = Helpers.Per(voted, grandTotalVoted);
            cPercentOfVoted.push(p);
        }

        return result;
    }
}

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

        var c1 = Helpers.getTotal(data);
        var r = new html.RenderSheet("xtotal", c1);
        r.render();       


        // "Supporter"
        var c1 = Helpers.makeHist(data, "Supporter", null);
        var r = new html.RenderSheet("xsupporter", c1);
        r.render();

        var c1 = Helpers.makeHist(data, "Party", {
            "1": "(1) Hard GOP",
            "2": "(2) Soft GOP",
            "3": "(3) Independent",
            "4": "(4) Soft Dem",
            "5": "(5) Hard Dem",
            "": "Unidentified"
        });
        var r = new html.RenderSheet("xparty", c1);
        r.render();

        var c1 = Helpers.makeHist(data, "XTargetPri",
            {
                "1": "Targeted voter",
                "": "Non targeted voter"
            });
        var r = new html.RenderSheet("xtarget", c1);
        r.render();

        var c1 = Helpers.makeHist(data, "ResultOfContact", null);
        var r = new html.RenderSheet("xcontact", c1);
        r.render();

        var c1 = Helpers.getSupportersThatNotVoted(data);
        var r = new html.RenderSheet("xs2", c1);
        r.setColumns(["RecId", "FirstName", "LastName", "PrecinctName"]);
        r.render();
    }
}
