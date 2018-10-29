
// Calculate and draw turnout chart 

import * as trc from 'trclib/trc2';
import * as h from './helpers';

declare var $: any; // JQuery 
declare var Chart: any; // external definition for Chart,  http://www.chartjs.org/docs/latest/getting-started/

interface IPoint { // from ChartJS
    x : number;
    y : number;    
}

// For trend chart. 
// Track people with a hist,party score. 
// We can then sort by hist to get N most likly voters. 
class People {
    public constructor(hist : number, party : string) {
        this.hist = hist;
        this.gop = 0;
        this.dem = 0;

        if (party == '1' || party == '2') {
            this.gop++;
        } else if (party == '4' || party == '5') {
            this.dem++;
        }
    }

    public hist : number;
    public gop : number;
    public dem : number;   
}

// The chart x axis is numbers 1..100  whole integer representing percents.
// The calculation buckets them into buckets of (widht)
const width : number = 5;
const numBuckets : number = 100  / width;

const numBuckets2 : number = 5;

export class TurnoutChart
{
    private static NewArray(len : number) : number[] { 
        var x : number[]= [];
        for(var i = 0; i < len; i++) {
            x[i] =0 ;
        }
        return x;
    }

    
    // 1...100 --> Bucket
    public static IntPercentToBucket(x  : number ) : number {
        //return Math.floor(x / width);
        return Math.round(x / width);
    }
    
    public static Bucket2(x  : number ) : number {
        return Math.floor(x / (100/numBuckets2));
    }

    public static work(data : trc.ISheetContents, currentVotes : number) : void {

        // Validate we have required columns 
        var colHist = data["History"];
        var colParty = data["Party"];
        var recIds = data["RecId"];
        var colVoted  = data["XVoted"]; // already validated 

        if (!colHist || !colParty) {
            $("#TurnoutChart").hide();
            return;
        }

        

        // score[history] = net # GOP
        // data used for projection 
        var scores  : People[] = [];

        // Data used for the Histogram by Propensity by Party 
        var voted2 : number[][] = [ // [Party][Bucket] , party 0...5
                TurnoutChart.NewArray(numBuckets2) , // 0
                TurnoutChart.NewArray(numBuckets2),
                TurnoutChart.NewArray(numBuckets2),
                TurnoutChart.NewArray(numBuckets2),
                TurnoutChart.NewArray(numBuckets2),
                TurnoutChart.NewArray(numBuckets2)];
        
                var totals2 : number[] = TurnoutChart.NewArray(numBuckets2);  // for all, ignoring party id 
                
        var noHist = 0; // how many rows don't have a history model? 
        var projectedVotes = 0; // Total number of expected voteds
        for(var i = 0; i < colHist.length; i++)
        {
            var hist = colHist[i];
            var party = colParty[i];
            var recId = recIds[i];

            var x : number =TurnoutChart.percentToInt(hist); // 0..100
            if (isNaN(x) || x < 0 || x > 100)
            {
                noHist++;
                continue;
            }
            projectedVotes += (x/100);

            // For Histogram
            {
                totals2[TurnoutChart.Bucket2(x)]++;
                if (h.Helpers.isTrue(colVoted[i]))
                {
                    var partyId = parseInt(party);
                    if (isNaN(partyId) || partyId > 5 || partyId < 0) {
                        partyId = 0;
                    }
                    voted2[partyId][TurnoutChart.Bucket2(x)]++;
                }
            }

            // For Trend chart
            {
                var p = new People(x, party);
                scores.push(p);
            }      
        } // end loop through all voters 

      
        // Chart histogram 
        TurnoutChart.RenderHistogram(totals2, voted2);

        // Chart projection 
        var scoresPercent : number[]  = TurnoutChart.ComputeProjectionScores(scores);
        var totalRegistered = colHist.length;
        TurnoutChart.RenderProjection(scoresPercent, currentVotes, projectedVotes, totalRegistered);
    }


    // 'scores' is normalized inputs of (hist, party)
    // Convert that to a GOP% array (of length bucket) that we can graph
    private static ComputeProjectionScores(
        scores  : People[]
        ) : number[] {
            var gopScores : number[] = TurnoutChart.NewArray(numBuckets);
            var demScores : number[] = TurnoutChart.NewArray(numBuckets);

        // Sort by descending order of propensity. 
        // if only 5% turnout, it's the ones with highest propensity. 
        scores.sort( (a,b) => b.hist -  a.hist);

        var bucketWidth = scores.length / numBuckets;
        for(var i = 0; i < scores.length; i++)
        {
            var bucket = Math.floor(i / bucketWidth);
            var p = scores[i];
            gopScores[bucket] += p.gop;
            demScores[bucket] += p.dem;
        }
        
        // Make it cumulative 
        for(var i =0; i < numBuckets-1; i++) {
            gopScores[i+1] += gopScores[i];
            demScores[i+1] += demScores[i];
        }

        // Convert to %        
        // + is GOP ahead, - is dem ahead
        var scoresPercent : number[] = [];
        for(var i =0; i < numBuckets; i++) {
            var total = gopScores[i] + demScores[i];
            var per = gopScores[i] * 100 / total; // 0 ... 100
            scoresPercent[i] = per - 50; 
        }

        return scoresPercent;
    } 

    private static RenderProjection(
        scoresPercent : number[], // length = Buckets, value  is % that GOP is above 50. 
        currentVotes : number, // Number of people voted so far,  < totalRegistered
        projectedVotes : number, // Number we expect to vote, < totalRegistered
        totalRegistered : number  // total size of universe 

    ) : void 
    {
        var labels : string[]= [];
        var dataGop : IPoint[] = [];
        var dataDem : IPoint[] = [];
        for(var i =0; i < numBuckets; i++) {
            var gop : number = scoresPercent[i];
            var dem : number = 0;

            if (gop < 0) {
                dem = gop;
                gop =0;
            }
            dataGop.push( { x : i, y : gop});
            dataDem.push( { x : i, y : dem});
            labels.push((i * width).toString()+ "%");
        }

        // Line in line  http://stackoverflow.com/questions/36329630/chart-js-2-0-vertical-lines

        // http://www.chartjs.org/docs/latest/charts/line.html
        var ctx =  "myChart"; // <canvas> id

        // More precise? 
        // https://stackoverflow.com/questions/34161616/chart-js-line-graphs-fill-area-above-line-as-opposed-to-below-and-to-the-right  ?? 

        var valueToday = labels[TurnoutChart.IntPercentToBucket(currentVotes * 100 / totalRegistered)];
        var valueProjected = labels[TurnoutChart.IntPercentToBucket(projectedVotes * 100/ totalRegistered)];
        
        
        // Uses https://github.com/chartjs/chartjs-plugin-annotation  to draw the vertical markers. 
        var chart = new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',
        
            options: {
                scales: {
                    yAxes: [{
                      scaleLabel: {
                        display: true,
                        labelString: 'GOP%'
                      }
                    }],
                    xAxes: [{
                      scaleLabel: {
                        display: true,
                        labelString: 'Turnout%'
                      }
                    }],
                  },
            
                legend: {
                    // Disable Clicking on legend. Don't want it toggling data. 
                    onClick: (e : any) => e.stopPropagation()
                 },        
                annotation: {
                  annotations: [
                    {
                      type: "line",
                      mode: "vertical",
                      scaleID: "x-axis-0",
                      value: valueToday,
                      borderColor: "red",
                      label: {
                        content: "TODAY",
                        enabled: true,
                        position: "top"
                      }
                    },
                    {
                        type: "line",
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: valueProjected,
                        borderColor: "black",
                        label: {
                          content: "Projected",
                          enabled: true,
                          position: "top"
                        }
                      }
                  ]
                }
              },
            // The data for our dataset
            // See  http://www.chartjs.org/docs/latest/configuration/elements#point-styles for details here
            data: {
                labels: labels,
                // lineAtIndex: 2,
                datasets: [{
                    fill: true,
                    lineTension : 0,
                    label: "GOP Ahead",
                    backgroundColor: "#ff6384", // 'rgb(255, 99, 132)',
                    pointBackgroundColor : '#000000',
                    pointRadius : 1,
                    borderColor: '#000000',
                    data: dataGop
                },
                {
                    fill: true,
                    lineTension : 0,
                    label: "DEM Ahead",
                    backgroundColor: "#36a2eb", 
                    borderColor: '#000000',
                    pointBackgroundColor : '#000000',
                    pointRadius : 1,
                    data: dataDem
                }]
            }
        
            // Configuration options go here           
        });
    }

    private static RenderHistogram(
        totals2 : number[], // includes non-voted 
        voted2 : number[][]) : void
        // Show Actual vs. Predicted . myChart2 
        {
            var labels2 : string[] = [];
            var backgroundColor : string[][] = [ // [partyId][bucket]
                [], [], [],[],[],[]
            ] 
            var borderColor : string[] = [];

            for(var i = 0; i < voted2[0].length; i++) {
                labels2.push(   // "40%-60%"
                    ((i) * (100/numBuckets2)).toString()+ "%-" + 
                    ((i+1) * (100/numBuckets2)).toString()+ "%");
                    
                backgroundColor[0].push("#BBBBBB");
                backgroundColor[1].push("#FF0000"); // red 
                backgroundColor[2].push("#880000");
                backgroundColor[3].push("#880088"); 
                backgroundColor[4].push("#000088");
                backgroundColor[5].push("#0000FF"); // Blue 
                                
                borderColor.push("#000000");
            }

            var barChartData = {
                labels: labels2,
                datasets: [{
                    label: 'Unidentified (0)',
                    backgroundColor : backgroundColor[0],
                    borderColor : borderColor,
                    borderWidth: 1,
                    data: voted2[0]
                },
                {
                    label: 'Hard GOP (1)',
                    backgroundColor : backgroundColor[1],
                    borderColor : borderColor,
                    borderWidth: 1,
                    data: voted2[1]
                },
                {
                    label: 'Soft GOP (2)',
                    backgroundColor : backgroundColor[2],
                    borderColor : borderColor,
                    borderWidth: 1,
                    data: voted2[2]
                },
                {
                    label: 'Ind (3)',
                    backgroundColor : backgroundColor[3],
                    borderColor : borderColor,
                    borderWidth: 1,
                    data: voted2[3]
                },{
                    label: 'Soft Dem (4)',
                    backgroundColor : backgroundColor[4],
                    borderColor : borderColor,
                    borderWidth: 1,
                    data: voted2[4]
                },
                {
                    label: 'Hard Dem (5)',
                    backgroundColor : backgroundColor[5],
                    borderColor : borderColor,
                    borderWidth: 1,
                    data: voted2[5]
                },
                {
                    label: 'Total Universe',
                    data: totals2,
                    type: 'line' // Mixed!
                  }]
    
            };
            new Chart("myChart2", {
				type: 'bar',
				data: barChartData,
				options: {
                    scales: {
                        yAxes: [{
                            stacked: true,
                          scaleLabel: {
                            display: true,
                            labelString: 'Voter Turnout'
                          }
                        }],
                        xAxes: [{
                            stacked: true,
                            scaleLabel: {
                              display: true,
                              labelString: 'Propensity buckets'
                            }
                          }]
                      },                    
                    barPercentage : 1,
					responsive: true,
					legend: {
						position: 'top',
					},
					title: {
						display: true,
						text: 'Actual Turnout grouped by Propensity'
                    }                   
				}
			});
        }

    // return 1...100
    private static percentToInt(hist : string) : number {
        return h.Helpers.percentToInt(hist);
    }
}