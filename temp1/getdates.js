function getCurrentFullDate_ForDB()
    {
        let dateFormatted = null;

          const inputs = document.getElementsByClassName("el-input__inner");

          for (let i = 0; i < inputs.length; i++)
          {
              let dateString = inputs[i].value;


              if(dateString != '' && dateString.length > 4)
              {
                  let dateCurrent = new Date(dateString.replace(" ", "T"));

                  let monthValue = (dateCurrent.getMonth()+1).toString().padStart(2, '0');

                  dateFormatted = (dateCurrent.getFullYear() + "-" + (monthValue) + "-" + dateCurrent.getDate());


                  break;
              }
          }
          return dateFormatted;
    }


    return getCurrentFullDate_ForDB();

