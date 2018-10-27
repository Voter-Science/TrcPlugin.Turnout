// Helpers for doing actual data manipluation 
import * as trc from 'trclib/trc2';

export class Helpers {
    // parse "15%" --> 15,  .15 --> 15
    //  return 0...100
    public static percentToInt(hist : string) : number {
        if (!hist || hist.length == 0) {
            return NaN;
        } 
        var result : number = parseFloat(hist);
        if (hist[hist.length-1] != '%') {
            result = result * 100.0;
        }
        return result;
    }

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

        var colHist = data["History"];
        
        var grandTotal = 0;
        var grandTotalVoted = 0;
        var projectedVotes = 0;
        var projectedTotal = 0;

        // Count them
        for (var iRow = 0; iRow < cVoted.length; iRow++) {
            grandTotal++;            
            if (Helpers.isTrue(cVoted[iRow])) {                
                grandTotalVoted++;
            }            

            if (!!colHist) {
                var hist = colHist[iRow];
                var z : number =Helpers.percentToInt(hist);
                if (!isNaN(z))
                {
                    projectedVotes += (z/100);
                    projectedTotal++;
                }
            }
        }     

        var x : trc.ISheetContents = {};
        x["Total"] = [grandTotal.toString()];
        x["Voted"] = [grandTotalVoted.toString()];
        x["Turnout%"] = [Helpers.Per(grandTotalVoted, grandTotal)];
        if (projectedTotal > 0) 
        {
            x["Projected%"] = [Helpers.Per(projectedVotes, projectedTotal)];
        }
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
