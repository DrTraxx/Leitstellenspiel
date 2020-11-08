// ==UserScript==
// @name         shareBuildings
// @version      1.0.0
// @description  gibt automatisch Krankenhäuser und Zellen im Verband frei
// @author       DrTraxx
// @include      /^https?:\/\/(?:w{3}\.)?(?:(policie\.)?operacni-stredisko\.cz|(politi\.)?alarmcentral-spil\.dk|(polizei\.)?leitstellenspiel\.de|missionchief\.gr|(?:(police\.)?missionchief-australia|(police\.)?missionchief|(poliisi\.)?hatakeskuspeli|missionchief-japan|missionchief-korea|nodsentralspillet|meldkamerspel|operador193|jogo-operador112|jocdispecerat112|dispecerske-centrum|112-merkez|dyspetcher101-game)\.com|(police\.)?missionchief\.co\.uk|centro-de-mando\.es|centro-de-mando\.mx|(police\.)?operateur112\.fr|(polizia\.)?operatore112\.it|operatorratunkowy\.pl|dispetcher112\.ru|larmcentralen-spelet\.se)\/.*$/
// @grant        none
// ==/UserScript==
/* global $, user_id, I18n */

(async function() {
    'use strict';

    if(!sessionStorage.aBuildings || JSON.parse(sessionStorage.aBuildings).lastUpdate < (new Date().getTime() - 5 * 1000 * 60) || JSON.parse(sessionStorage.aBuildings).userId != user_id) {
        await $.getJSON('/api/buildings').done(data => sessionStorage.setItem('aBuildings', JSON.stringify({lastUpdate: new Date().getTime(), value: data, userId: user_id})) );
    }

    var aBuildings = JSON.parse(sessionStorage.aBuildings).value;
    var beds = [];
    var cells = [];

    for(var i in aBuildings) {
        var e = aBuildings[i];
        if(e.building_type === 4) beds.push(e);
        if(e.building_type === 6 || e.building_type === 19) cells.push(e);
    }

    $("body")
        .prepend(`<div class="modal fade bd-example-modal-lg" id="shBuModal" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg" role="document">
                      <div class="modal-content">
                        <div class="modal-header">
                          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&#x274C;</span>
                          </button>
                          <h3 class="modal-title"><center>Gebäude freigeben</center></h3>
                        </div>
                          <div class="modal-body" id="shBuModalBody">
                            <div class="form-check">
                              <input class="form-check-input" type="checkbox" value="" id="shBuCheckShare">
                              <label class="form-check-label" for="shBuCheckShare">
                                Gebäude freigeben
                              </label>
                            </div>
                            <select class="custom-select hidden" id="shBuSelPercentage" style="width:15em">
                              <option selected value="0">0 Prozent</option>
                              <option value="1">10 Prozent</option>
                              <option value="2">20 Prozent</option>
                              <option value="3">30 Prozent</option>
                              <option value="4">40 Prozent</option>
                              <option value="5">50 Prozent</option>
                            </select>
                            <br>
                            <br>
                            <div class="btn-group">
                              <a class="btn btn-primary" id="shBuShareCells">Polizeiwachen</a>
                              <a class="btn btn-primary" id="shBuShareHospitals">Krankenhäuser</a>
                            </div>
                            <br>
                            <br>
                            <div class="hidden" id="shBuDivHospitals">
                              <h4>Krankenhäuser:</h4>
                              <div class="progress">
                                <div class="progress-bar bg-success" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${beds.length}" id="shBuPrgsBeds"></div>
                              </div>
                            </div>
                            <div class="hidden" id="shBuDivCells">
                              <h4>Polizeiwachen:</h4>
                              <div class="progress">
                                <div class="progress-bar bg-success" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="${cells.length}" id="shBuPrgsCells"></div>
                              </div>
                            </div>
                          </div>
                          <div class="modal-footer">
                            <button type="button" class="btn btn-danger" data-dismiss="modal">Schließen</button>
                            <div class="pull-left">v ${GM_info.script.version}</div>
                          </div>
                    </div>
                  </div>`);

    $("#building_panel_heading .btn-group").append(`<a class="btn btn-default btn-xs" data-toggle="modal" data-target="#shBuModal" id="shBuOpenModal">Gebäude freigeben</a>`);

    async function shareBuildings(array, modalElement) {
        var count = 0;

        for(var i in array) {
            count++;
            var percent = Math.round(count / array.length * 100);
            var e = array[i];
            modalElement
                .attr("aria-valuenow", count)
                .css({"width" : percent+"%"})
                .text(count + " / " + array.length.toLocaleString());
            if($("#shBuCheckShare")[0].checked) {
                if(!e.is_alliance_shared) {
                    await $.get("/buildings/" + e.id + "/alliance");
                    e.is_alliance_shared = true;
                }
                await $.get("/buildings/" + e.id + "/alliance_costs/" + $("#shBuSelPercentage").val());
            } else {
                if(e.is_alliance_shared) {
                    await $.get("/buildings/" + e.id + "/alliance");
                    e.is_alliance_shared = false;
                }
            }
        }
    }

    $("body").on("click", "#shBuShareHospitals", function() {
        $("#shBuDivHospitals").removeClass("hidden");
        $("#shBuPrgsBeds")
                    .attr("aria-valuenow", 0)
                    .css({"width" : "0%"})
                    .text("0 / " + beds.length.toLocaleString());
        shareBuildings(beds, $("#shBuPrgsBeds"));
    });

    $("body").on("click", "#shBuShareCells", function() {
        $("#shBuDivCells").removeClass("hidden");
        $("#shBuPrgsCells")
                    .attr("aria-valuenow", 0)
                    .css({"width" : "0%"})
                    .text("0 / " + cells.length.toLocaleString());
        shareBuildings(cells, $("#shBuPrgsCells"));
    });

    $("body").on("click", "#shBuCheckShare", function() {
        if($("#shBuCheckShare")[0].checked) {
            $("#shBuSelPercentage").removeClass("hidden");
        } else {
            $("#shBuSelPercentage").addClass("hidden");
        }
    });


})();