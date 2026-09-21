/// @description  Movements

SCR_buttons();


// Up, Down
if (global.btUpPress)
{
    option -= 1;
}
if (global.btDownPress) 
{
    option += 1;
}

// Limit
if (option > optionLimit) 
{
    option = 1;
}
if (option < 1) 
{
    option = optionLimit;
}

///Color Selected

if (option == 1) {c1 = c_yellow_dark;}
else {c1 = c_white;}

if (option == 2) {c2 = c_yellow_dark;}
else {c2 = c_white;}

if (option == 3) {c3 = c_yellow_dark;}
else {c3 = c_white;}

if (option == 4) {c4 = c_yellow_dark;}
else {c4 = c_white;}

if (option == 5) {c5 = c_yellow_dark;}
else {c5 = c_white;}

/// Actions

if (global.btSpacePress)
{
    switch(option)
    {
        case 1:
            global.music++;
            break;
        case 2:
            global.buttons++;
            break;
        case 3:
            if (os_type == os_windows)
            {
                global.windowSize++;
            }
            break;
        case 4:
            if (os_type == os_windows)
            {
                global.screenSize++;
            }
            break;
        case 5:
            instance_destroy();
            break;
    }
}


/// Limits

// Music
if (global.music > 1)
{
    global.music = 0;
    audio_stop_all();
}

// Buttons
if (global.buttons > 1)
{
    global.buttons = 0;
}

// Window Size
if (global.windowSize > 3)
{
    global.windowSize = 1;
}

// Screen Size
if (global.screenSize > 2)
{
    global.screenSize = 0;
}

/// Text: On / Off

switch(global.music)
{
    case 0: t1 = "off"; break;
    case 1: t1 = "on"; break;
}

switch(global.buttons)
{
    case 0: t2 = "off"; break;
    case 1: t2 = "on"; break;
}

switch(global.windowSize)
{
    case 1: t3 = "1x"; break;
    case 2: t3 = "2x"; break;
    case 3: t3 = "3x"; break;
}

switch(global.screenSize)
{
    case 0: t4 = "auto"; break;
    case 1: t4 = "wide"; break;
    case 2: t4 = "retro"; break;
}

/// Screen Refresh

if (option == 3 || option == 4)
{
    SCR_screen();
    window_center();
}

