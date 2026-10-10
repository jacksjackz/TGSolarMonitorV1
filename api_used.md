APIs used (base: https://tgapps.synology.me:40556)

#  Method  Endpoint                                     scriptInit  scriptPost  Target
-  ------  -------------------------------------------  ----------  ----------  ----------------------------------
1  POST    /postTGSolar                                 Yes         Yes         In-memory mapTGSolarAccount (live)
2  GET     /getDataPreviousMonth/{MMYYYY}/{username}    Yes         -           datapreviousmonth table
3  POST    /postDataPreviousMonth                       Yes         -           datapreviousmonth table
4  GET     /getDataCurrentMonth/{MMYYYY}/{username}     Yes         -           datacurrentmonth table
5  POST    /postDataCurrentMonth                        Yes         -           datacurrentmonth table
6  GET     /getDailyDateLatest/{DDMMYYYY}/{username}    Yes         -           datadaily table
7  POST    /postDailyDate                               Yes         -           datadaily table

Notes:
- scriptPost.js calls only #1 (type: id_target_today).
- scriptInit.js calls all 7.
