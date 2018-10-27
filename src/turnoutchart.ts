
// Calculate and draw turnout chart 

import * as trc from 'trclib/trc2';
import * as h from './helpers';

declare var $: any; // JQuery 
declare var Chart: any; // external definition for Chart,  http://www.chartjs.org/docs/latest/getting-started/

interface IPoint { // from ChartJS
    x : number;
    y : number;    
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
        var colHist = data["History"];
        var colParty = data["Party"];
        var recIds = data["RecId"];
        var colVoted  = data["XVoted"];
        if (!colHist || !colParty) {
            $("#TurnoutChart").hide();
            return;
        }

        

        // score[history] = net # GOP
        var gopScores : number[] = TurnoutChart.NewArray(numBuckets);
        var demScores : number[] = TurnoutChart.NewArray(numBuckets);
        // var scores : number[] = TurnoutChart.NewArray(numBuckets);
        var totals : number[] = TurnoutChart.NewArray(numBuckets); // if we have a party id 
        var voted2 : number[][] =  // [Party][Bucket] , party 0...5
        [ TurnoutChart.NewArray(numBuckets2) , // 0
            TurnoutChart.NewArray(numBuckets2),
            TurnoutChart.NewArray(numBuckets2),
            TurnoutChart.NewArray(numBuckets2),
            TurnoutChart.NewArray(numBuckets2),
            TurnoutChart.NewArray(numBuckets2)];

        var totals2 : number[] = TurnoutChart.NewArray(numBuckets2);  // for all, ignoring party id 
                
        var noHist = 0;
        var projectedVotes = 0;
        for(var i = 0; i < colHist.length; i++)
        {
            var hist = colHist[i];
            var party = colParty[i];
            var recId = recIds[i];

            // 0...19 buckets
            var x =TurnoutChart.percentToInt(hist);
            if (isNaN(x))
            {
                noHist++;
                continue;
            }
            projectedVotes += (x/100);
            var bucket : number = TurnoutChart.IntPercentToBucket(x);


            totals2[TurnoutChart.Bucket2(x)]++;
            if (h.Helpers.isTrue(colVoted[i]))
            {
                var partyId = parseInt(party);
                if (isNaN(partyId) || partyId > 5 || partyId < 0) {
                    partyId = 0;
                }
                voted2[partyId][TurnoutChart.Bucket2(x)]++;
            }
            

            // var score = scores[bucket];
            var total = totals[bucket];
            if (party == '1' || party == '2') {
                // score++;
                gopScores[bucket]++;
                total++;
            } else if (party == '4' || party == '5') {
                // score--;
                demScores[bucket]++;
                total++;
            }
            // scores[bucket] = score;
            totals[bucket] = total;
        }
        
        // Make it cumulative 
        for(var i =0; i < numBuckets-1; i++) {
            //scores[i+1] += scores[i];
            gopScores[i+1] += gopScores[i];
            demScores[i+1] += demScores[i];
            totals[i+1] += totals[i];
        }

        // Convert to %        
        // + is GOP ahead, - is dem ahead
        var scoresPercent : number[] = [];
        for(var i =0; i < numBuckets; i++) {
            // scoresPercent[i] = Math.floor(scores[i] * 100 / totals[i]);
            var per = Math.floor(gopScores[i] * 100 / totals[i]); // 0 ... 100
            scoresPercent[i] = per - 50; 
        }

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

 
        // Chart it!

        // Show Actual vs. Predicted . myChart2 
        {
            var labels2 : string[] = [];
            var backgroundColor : string[][] = [ // [partyId][bucket]
                [], [], [],[],[],[]
            ] 
            var borderColor : string[] = [];

            for(var i = 0; i < totals2.length; i++) {
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

        // Line in line  http://stackoverflow.com/questions/36329630/chart-js-2-0-vertical-lines

        // http://www.chartjs.org/docs/latest/charts/line.html
        var ctx =  "myChart"; // <canvas> id

        // More precise? 
        // https://stackoverflow.com/questions/34161616/chart-js-line-graphs-fill-area-above-line-as-opposed-to-below-and-to-the-right  ?? 

        var totalRegistered = colHist.length;
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

    // return 1...100
    private static percentToInt(hist : string) : number {
        return h.Helpers.percentToInt(hist);
    }
}