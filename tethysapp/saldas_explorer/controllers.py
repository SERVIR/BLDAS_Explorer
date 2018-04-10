from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import Button
import datetime
import json
from django.http import JsonResponse
from .utils import *

def home(request):
    """
    Controller for the app home page.
    """
    dekad_options = []
    month_options = []
    quarter_options = []

    for i in range(1,37):
        dekad = format(i,"02d")
        option = [dekad,'Dekad '+str(i)]
        dekad_options.append(option)

    for i in range(1, 13):
        month_options.append([datetime.date(2017, i, 1).strftime('%m'), datetime.date(2017, i, 1).strftime('%B')])

    for i in range(len(month_options) - 2):
        quarter = str(format(i + 1, '02d')) + str(format(i + 2, '02d')) + str(format(i + 3, '02d'))
        quarter_options.append([quarter,'Quarter '+str(quarter)])

    variable_info = get_variables_meta()

    context = {
        'variable_info': json.dumps(variable_info),
        'dekad_options':json.dumps(dekad_options),
        'month_options':json.dumps(month_options),
        'quarter_options':json.dumps(quarter_options)
    }

    return render(request, 'saldas_explorer/home.html', context)

def get_plot(request):
    return_obj = {}

    if request.is_ajax() and request.method == 'POST':
        info = request.POST

        variable = info.get("variable")

        return_obj["variable"] = variable

        point = request.POST['point']
        polygon = request.POST['polygon']

        if point:
            try:
                ts = get_pt_ts(variable,point)
                return_obj["time_series"] = ts
                return_obj["interaction"] = "point"
                return_obj["success"] = "success"
            except Exception as e:
                return_obj["error"] = "Error Processing Request: "+ str(e)

        if polygon:

            return_obj["interaction"] = "polygon"
            return_obj["success"] = "success"

    return JsonResponse(return_obj)