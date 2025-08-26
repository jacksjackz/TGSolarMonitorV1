function getCurrentMonthYear()
{
  let dateFormatted = null;

  const inputs = document.getElementsByClassName("el-input__inner");

  for (let i = 0; i < inputs.length; i++) 
  {
      let dateString = inputs[i].value;

      
      if(dateString != '' && dateString.length > 4)
      {
          let dateCurrent = new Date(dateString.replace(" ", "T"));
          console.log(dateCurrent);

          //console.log(dateCurrent.getFullYear());  // 2025
          //console.log(dateCurrent.getMonth() + 1); // 7 (months are 0-indexed)
          //console.log(dateCurrent.getDate());      // 7
          //console.log(dateCurrent.getHours());     // 0

          dateFormatted = (dateCurrent.getMonth()+1) + "/" + dateCurrent.getFullYear();

          
          break;
      }
        
  }

  return dateFormatted;

}

function getPreviousMonth()
{
  let dateFormatted = null;

  const inputs = document.getElementsByClassName("el-input__inner");

  for (let i = 0; i < inputs.length; i++) 
  {
      let dateString = inputs[i].value;

      
      if(dateString != '' && dateString.length > 4)
      {
          let dateCurrent = new Date(dateString.replace(" ", "T"));
          
          // Move to previous month
            dateCurrent.setMonth(dateCurrent.getMonth() - 1);

            const prevMonth = dateCurrent.getMonth() + 1; // +1 because months are 0-indexed
            const prevYear = dateCurrent.getFullYear();

            //console.log(`Previous month: ${prevMonth}, Previous year: ${prevYear}`);

          dateFormatted = (dateCurrent.getMonth()+1) + "/" + dateCurrent.getFullYear();

          
          break;
      }
        
  }

  return dateFormatted;

}
