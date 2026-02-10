#ifndef FENSTER_H
#define FENSTER_H

#if defined(__APPLE__)
#include <CoreGraphics/CoreGraphics.h>
#include <objc/NSObjCRuntime.h>
#include <objc/objc-runtime.h>
#elif defined(_WIN32)
#include <windows.h>
#else
#define _DEFAULT_SOURCE 1
#include <X11/XKBlib.h>
#include <X11/Xlib.h>
#include <X11/keysym.h>
#include <time.h>
#endif

#include <stdint.h>
#include <stdlib.h>

struct fenster {
  const char *title;
  int width;
  int height;
  uint32_t *buf;
  int keys[256]; /* keys are mostly ASCII, but arrows are 17..20 */
  int mod;       /* mod is 4 bits mask, ctrl=1, shift=2, alt=4, meta=8 */
  int x;
  int y;
  int mouse;
  float scale;      /* backing scale factor (1.0 normal, 2.0 Retina) */
  int phys_width;   /* width * scale */
  int phys_height;  /* height * scale */
#if defined(__APPLE__)
  id wnd;
#elif defined(_WIN32)
  HWND hwnd;
#else
  Display *dpy;
  Window w;
  GC gc;
  XImage *img;
#endif
};

#ifndef FENSTER_API
#define FENSTER_API extern
#endif
FENSTER_API int fenster_open(struct fenster *f);
FENSTER_API int fenster_loop(struct fenster *f);
FENSTER_API void fenster_close(struct fenster *f);
FENSTER_API void fenster_sleep(int64_t ms);
FENSTER_API int64_t fenster_time(void);
#define fenster_pixel(f, x, y) ((f)->buf[((y) * (f)->width) + (x)])

#ifndef FENSTER_HEADER
#if defined(__APPLE__)
#define msg(r, o, s) ((r(*)(id, SEL))objc_msgSend)(o, sel_getUid(s))
#define msg1(r, o, s, A, a)                                                    \
  ((r(*)(id, SEL, A))objc_msgSend)(o, sel_getUid(s), a)
#define msg2(r, o, s, A, a, B, b)                                              \
  ((r(*)(id, SEL, A, B))objc_msgSend)(o, sel_getUid(s), a, b)
#define msg3(r, o, s, A, a, B, b, C, c)                                        \
  ((r(*)(id, SEL, A, B, C))objc_msgSend)(o, sel_getUid(s), a, b, c)
#define msg4(r, o, s, A, a, B, b, C, c, D, d)                                  \
  ((r(*)(id, SEL, A, B, C, D))objc_msgSend)(o, sel_getUid(s), a, b, c, d)

#define cls(x) ((id)objc_getClass(x))

extern id const NSDefaultRunLoopMode;
extern id const NSApp;

static void fenster_draw_rect(id v, SEL s, CGRect r) {
  (void)r, (void)s;
  struct fenster *f = (struct fenster *)objc_getAssociatedObject(v, "fenster");
  CGContextRef context =
      msg(CGContextRef, msg(id, cls("NSGraphicsContext"), "currentContext"),
          "graphicsPort");
  CGColorSpaceRef space = CGColorSpaceCreateDeviceRGB();
  CGDataProviderRef provider = CGDataProviderCreateWithData(
      NULL, f->buf, (size_t)f->phys_width * (size_t)f->phys_height * 4, NULL);
  CGImageRef img =
      CGImageCreate(f->phys_width, f->phys_height, 8, 32, f->phys_width * 4,
                    space,
                    kCGImageAlphaNoneSkipFirst | kCGBitmapByteOrder32Little,
                    provider, NULL, false, kCGRenderingIntentDefault);
  CGColorSpaceRelease(space);
  CGDataProviderRelease(provider);
  CGContextDrawImage(context, CGRectMake(0, 0, f->width, f->height), img);
  CGImageRelease(img);
}

static BOOL fenster_should_close(id v, SEL s, id w) {
  (void)v, (void)s, (void)w;
  msg1(void, NSApp, "terminate:", id, NSApp);
  return YES;
}

FENSTER_API int fenster_open(struct fenster *f) {
  msg(id, cls("NSApplication"), "sharedApplication");
  msg1(void, NSApp, "setActivationPolicy:", NSInteger, 0);
  f->wnd = msg4(id, msg(id, cls("NSWindow"), "alloc"),
                "initWithContentRect:styleMask:backing:defer:", CGRect,
                CGRectMake(0, 0, f->width, f->height), NSUInteger, 11,
                NSUInteger, 2, BOOL, NO);
  Class windelegate =
      objc_allocateClassPair((Class)cls("NSObject"), "FensterDelegate", 0);
  class_addMethod(windelegate, sel_getUid("windowShouldClose:"),
                  (IMP)fenster_should_close, "c@:@");
  objc_registerClassPair(windelegate);
  msg1(void, f->wnd, "setDelegate:", id,
       msg(id, msg(id, (id)windelegate, "alloc"), "init"));
  Class c = objc_allocateClassPair((Class)cls("NSView"), "FensterView", 0);
  class_addMethod(c, sel_getUid("drawRect:"), (IMP)fenster_draw_rect, "i@:@@");
  objc_registerClassPair(c);

  id v = msg(id, msg(id, (id)c, "alloc"), "init");
  msg1(void, f->wnd, "setContentView:", id, v);
  objc_setAssociatedObject(v, "fenster", (id)f, OBJC_ASSOCIATION_ASSIGN);

  id title = msg1(id, cls("NSString"), "stringWithUTF8String:", const char *,
                  f->title);
  msg1(void, f->wnd, "setTitle:", id, title);
  msg1(void, f->wnd, "makeKeyAndOrderFront:", id, nil);
  msg(void, f->wnd, "center");
  msg1(void, NSApp, "activateIgnoringOtherApps:", BOOL, YES);

  /* Detect Retina backing scale factor */
  CGFloat s = ((CGFloat(*)(id, SEL))objc_msgSend)(f->wnd,
      sel_getUid("backingScaleFactor"));
  f->scale = (float)(s > 0 ? s : 1.0);
  f->phys_width = (int)(f->width * f->scale);
  f->phys_height = (int)(f->height * f->scale);

  return 0;
}

FENSTER_API void fenster_close(struct fenster *f) {
  msg(void, f->wnd, "close");
}

// clang-format off
static const uint8_t FENSTER_KEYCODES[128] = {65,83,68,70,72,71,90,88,67,86,0,66,81,87,69,82,89,84,49,50,51,52,54,53,61,57,55,45,56,48,93,79,85,91,73,80,10,76,74,39,75,59,92,44,47,78,77,46,9,32,96,8,0,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,26,2,3,127,0,5,0,4,0,20,19,18,17,0};
// clang-format on
FENSTER_API int fenster_loop(struct fenster *f) {
  msg1(void, msg(id, f->wnd, "contentView"), "setNeedsDisplay:", BOOL, YES);
  id ev = msg4(id, NSApp,
               "nextEventMatchingMask:untilDate:inMode:dequeue:", NSUInteger,
               NSUIntegerMax, id, NULL, id, NSDefaultRunLoopMode, BOOL, YES);
  if (!ev)
    return 0;
  NSUInteger evtype = msg(NSUInteger, ev, "type");
  switch (evtype) {
  case 1: /* NSEventTypeMouseDown */
    f->mouse |= 1;
    break;
  case 2: /* NSEventTypeMouseUp*/
    f->mouse &= ~1;
    break;
  case 5:
  case 6: { /* NSEventTypeMouseMoved */
    CGPoint xy = msg(CGPoint, ev, "locationInWindow");
    f->x = (int)xy.x;
    f->y = (int)(f->height - xy.y);
    return 0;
  }
  case 10: /*NSEventTypeKeyDown*/
  case 11: /*NSEventTypeKeyUp:*/ {
    NSUInteger k = msg(NSUInteger, ev, "keyCode");
    f->keys[k < 127 ? FENSTER_KEYCODES[k] : 0] = evtype == 10;
    NSUInteger mod = msg(NSUInteger, ev, "modifierFlags") >> 17;
    f->mod = (mod & 0xc) | ((mod & 1) << 1) | ((mod >> 1) & 1);
    return 0;
  }
  case 12: { /* NSEventTypeFlagsChanged — modifier key press/release */
    NSUInteger k = msg(NSUInteger, ev, "keyCode");
    NSUInteger flags = msg(NSUInteger, ev, "modifierFlags");
    NSUInteger mod = flags >> 17;
    f->mod = (mod & 0xc) | ((mod & 1) << 1) | ((mod >> 1) & 1);
    /* Device-dependent flags distinguish left/right modifiers */
    switch (k) {
    case 56: f->keys[128] = !!(flags & 0x00000002); break; /* Left Shift */
    case 60: f->keys[129] = !!(flags & 0x00000004); break; /* Right Shift */
    case 59: f->keys[130] = !!(flags & 0x00000001); break; /* Left Control */
    case 62: f->keys[131] = !!(flags & 0x00002000); break; /* Right Control */
    case 58: f->keys[132] = !!(flags & 0x00000020); break; /* Left Alt */
    case 61: f->keys[133] = !!(flags & 0x00000040); break; /* Right Alt */
    case 55: f->keys[134] = !!(flags & 0x00000008); break; /* Left Meta */
    case 54: f->keys[135] = !!(flags & 0x00000010); break; /* Right Meta */
    }
    return 0;
  }
  }
  msg1(void, NSApp, "sendEvent:", id, ev);
  /* Poll content view frame for resize */
  CGRect frame = msg(CGRect, msg(id, f->wnd, "contentView"), "frame");
  int newW = (int)frame.size.width;
  int newH = (int)frame.size.height;
  if (newW > 0 && newH > 0) {
    f->width = newW;
    f->height = newH;
  }
  /* Re-query scale (may change when window moves between displays) */
  CGFloat s = ((CGFloat(*)(id, SEL))objc_msgSend)(f->wnd,
      sel_getUid("backingScaleFactor"));
  f->scale = (float)(s > 0 ? s : 1.0);
  f->phys_width = (int)(f->width * f->scale);
  f->phys_height = (int)(f->height * f->scale);
  return 0;
}
#elif defined(_WIN32)
// clang-format off
static const uint8_t FENSTER_KEYCODES[] = {0,27,49,50,51,52,53,54,55,56,57,48,45,61,8,9,81,87,69,82,84,89,85,73,79,80,91,93,10,0,65,83,68,70,71,72,74,75,76,59,39,96,0,92,90,88,67,86,66,78,77,44,46,47,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,17,3,0,20,0,19,0,5,18,4,26,127};
// clang-format on
typedef struct BINFO{
    BITMAPINFOHEADER    bmiHeader;
    RGBQUAD             bmiColors[3];
}BINFO;
static LRESULT CALLBACK fenster_wndproc(HWND hwnd, UINT msg, WPARAM wParam,
                                        LPARAM lParam) {
  struct fenster *f = (struct fenster *)GetWindowLongPtr(hwnd, GWLP_USERDATA);
  switch (msg) {
  case WM_PAINT: {
    PAINTSTRUCT ps;
    HDC hdc = BeginPaint(hwnd, &ps);
    HDC memdc = CreateCompatibleDC(hdc);
    HBITMAP hbmp = CreateCompatibleBitmap(hdc, f->phys_width, f->phys_height);
    HBITMAP oldbmp = SelectObject(memdc, hbmp);
    BINFO bi = {{sizeof(bi), f->phys_width, -f->phys_height, 1, 32,
                 BI_BITFIELDS}};
    bi.bmiColors[0].rgbRed = 0xff;
    bi.bmiColors[1].rgbGreen = 0xff;
    bi.bmiColors[2].rgbBlue = 0xff;
    SetDIBitsToDevice(memdc, 0, 0, f->phys_width, f->phys_height, 0, 0, 0,
                      f->phys_height, f->buf, (BITMAPINFO *)&bi,
                      DIB_RGB_COLORS);
    SetStretchBltMode(hdc, COLORONCOLOR);
    StretchBlt(hdc, 0, 0, f->width, f->height, memdc, 0, 0, f->phys_width,
               f->phys_height, SRCCOPY);
    SelectObject(memdc, oldbmp);
    DeleteObject(hbmp);
    DeleteDC(memdc);
    EndPaint(hwnd, &ps);
  } break;
  case WM_CLOSE:
    DestroyWindow(hwnd);
    break;
  case WM_LBUTTONDOWN:
  case WM_LBUTTONUP:
    f->mouse = (msg == WM_LBUTTONDOWN);
    break;
  case WM_MOUSEMOVE:
    f->y = HIWORD(lParam), f->x = LOWORD(lParam);
    break;
  case WM_KEYDOWN:
  case WM_KEYUP: {
    f->mod = ((GetKeyState(VK_CONTROL) & 0x8000) >> 15) |
             ((GetKeyState(VK_SHIFT) & 0x8000) >> 14) |
             ((GetKeyState(VK_MENU) & 0x8000) >> 13) |
             (((GetKeyState(VK_LWIN) | GetKeyState(VK_RWIN)) & 0x8000) >> 12);
    int pressed = !((lParam >> 31) & 1);
    f->keys[FENSTER_KEYCODES[HIWORD(lParam) & 0x1ff]] = pressed;
    /* Left/right modifier key tracking */
    f->keys[128] = !!(GetKeyState(VK_LSHIFT) & 0x8000);
    f->keys[129] = !!(GetKeyState(VK_RSHIFT) & 0x8000);
    f->keys[130] = !!(GetKeyState(VK_LCONTROL) & 0x8000);
    f->keys[131] = !!(GetKeyState(VK_RCONTROL) & 0x8000);
    f->keys[132] = !!(GetKeyState(VK_LMENU) & 0x8000);
    f->keys[133] = !!(GetKeyState(VK_RMENU) & 0x8000);
    f->keys[134] = !!(GetKeyState(VK_LWIN) & 0x8000);
    f->keys[135] = !!(GetKeyState(VK_RWIN) & 0x8000);
  } break;
  case WM_SIZE:
    f->width = LOWORD(lParam);
    f->height = HIWORD(lParam);
    f->phys_width = (int)(f->width * f->scale);
    f->phys_height = (int)(f->height * f->scale);
    break;
  case WM_DPICHANGED: {
    UINT dpi = HIWORD(wParam);
    f->scale = (float)dpi / 96.0f;
    f->phys_width = (int)(f->width * f->scale);
    f->phys_height = (int)(f->height * f->scale);
    RECT *rc = (RECT *)lParam;
    SetWindowPos(hwnd, NULL, rc->left, rc->top, rc->right - rc->left,
                 rc->bottom - rc->top, SWP_NOZORDER | SWP_NOACTIVATE);
  } break;
  case WM_DESTROY:
    PostQuitMessage(0);
    break;
  default:
    return DefWindowProc(hwnd, msg, wParam, lParam);
  }
  return 0;
}

FENSTER_API int fenster_open(struct fenster *f) {
  HINSTANCE hInstance = GetModuleHandle(NULL);
  WNDCLASSEX wc = {0};
  wc.cbSize = sizeof(WNDCLASSEX);
  wc.style = CS_VREDRAW | CS_HREDRAW;
  wc.lpfnWndProc = fenster_wndproc;
  wc.hInstance = hInstance;
  wc.lpszClassName = f->title;
  RegisterClassEx(&wc);
  f->hwnd = CreateWindowEx(WS_EX_CLIENTEDGE, f->title, f->title,
                           WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT,
                           f->width, f->height, NULL, NULL, hInstance, NULL);

  if (f->hwnd == NULL)
    return -1;
  SetWindowLongPtr(f->hwnd, GWLP_USERDATA, (LONG_PTR)f);
  ShowWindow(f->hwnd, SW_NORMAL);
  UpdateWindow(f->hwnd);

  /* Detect DPI scale via GetDpiForWindow (Win10 1607+, backward compat) */
  f->scale = 1.0f;
  {
    HMODULE user32 = GetModuleHandleA("user32.dll");
    if (user32) {
      typedef UINT (WINAPI *PFN_GetDpiForWindow)(HWND);
      PFN_GetDpiForWindow pGetDpiForWindow =
          (PFN_GetDpiForWindow)GetProcAddress(user32, "GetDpiForWindow");
      if (pGetDpiForWindow) {
        UINT dpi = pGetDpiForWindow(f->hwnd);
        if (dpi > 0) f->scale = (float)dpi / 96.0f;
      }
    }
  }
  f->phys_width = (int)(f->width * f->scale);
  f->phys_height = (int)(f->height * f->scale);

  return 0;
}

FENSTER_API void fenster_close(struct fenster *f) { (void)f; }

FENSTER_API int fenster_loop(struct fenster *f) {
  MSG msg;
  while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
    if (msg.message == WM_QUIT)
      return -1;
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }
  InvalidateRect(f->hwnd, NULL, TRUE);
  return 0;
}
#else
// clang-format off
static int FENSTER_KEYCODES[140] = {XK_BackSpace,8,XK_Delete,127,XK_Down,18,XK_End,5,XK_Escape,27,XK_Home,2,XK_Insert,26,XK_Left,20,XK_Page_Down,4,XK_Page_Up,3,XK_Return,10,XK_Right,19,XK_Tab,9,XK_Up,17,XK_apostrophe,39,XK_backslash,92,XK_bracketleft,91,XK_bracketright,93,XK_comma,44,XK_equal,61,XK_grave,96,XK_minus,45,XK_period,46,XK_semicolon,59,XK_slash,47,XK_space,32,XK_a,65,XK_b,66,XK_c,67,XK_d,68,XK_e,69,XK_f,70,XK_g,71,XK_h,72,XK_i,73,XK_j,74,XK_k,75,XK_l,76,XK_m,77,XK_n,78,XK_o,79,XK_p,80,XK_q,81,XK_r,82,XK_s,83,XK_t,84,XK_u,85,XK_v,86,XK_w,87,XK_x,88,XK_y,89,XK_z,90,XK_0,48,XK_1,49,XK_2,50,XK_3,51,XK_4,52,XK_5,53,XK_6,54,XK_7,55,XK_8,56,XK_9,57,XK_Shift_L,128,XK_Shift_R,129,XK_Control_L,130,XK_Control_R,131,XK_Alt_L,132,XK_Alt_R,133,XK_Super_L,134,XK_Super_R,135};
// clang-format on
FENSTER_API int fenster_open(struct fenster *f) {
  f->dpy = XOpenDisplay(NULL);
  int screen = DefaultScreen(f->dpy);
  f->w = XCreateSimpleWindow(f->dpy, RootWindow(f->dpy, screen), 0, 0, f->width,
                             f->height, 0, BlackPixel(f->dpy, screen),
                             WhitePixel(f->dpy, screen));
  f->gc = XCreateGC(f->dpy, f->w, 0, 0);
  XSelectInput(f->dpy, f->w,
               ExposureMask | KeyPressMask | KeyReleaseMask | ButtonPressMask |
                   ButtonReleaseMask | PointerMotionMask |
                   StructureNotifyMask);
  XStoreName(f->dpy, f->w, f->title);
  XMapWindow(f->dpy, f->w);
  XSync(f->dpy, f->w);
  f->img = XCreateImage(f->dpy, DefaultVisual(f->dpy, 0), 24, ZPixmap, 0,
                        (char *)f->buf, f->width, f->height, 32, 0);
  /* Linux: default scale 1.0 (no standard HiDPI detection) */
  f->scale = 1.0f;
  f->phys_width = f->width;
  f->phys_height = f->height;
  return 0;
}
FENSTER_API void fenster_close(struct fenster *f) { XCloseDisplay(f->dpy); }
FENSTER_API int fenster_loop(struct fenster *f) {
  XEvent ev;
  XPutImage(f->dpy, f->w, f->gc, f->img, 0, 0, 0, 0, f->width, f->height);
  XFlush(f->dpy);
  while (XPending(f->dpy)) {
    XNextEvent(f->dpy, &ev);
    switch (ev.type) {
    case ButtonPress:
    case ButtonRelease:
      f->mouse = (ev.type == ButtonPress);
      break;
    case MotionNotify:
      f->x = ev.xmotion.x, f->y = ev.xmotion.y;
      break;
    case KeyPress:
    case KeyRelease: {
      int m = ev.xkey.state;
      int k = XkbKeycodeToKeysym(f->dpy, ev.xkey.keycode, 0, 0);
      for (unsigned int i = 0; i < 140; i += 2) {
        if (FENSTER_KEYCODES[i] == k) {
          f->keys[FENSTER_KEYCODES[i + 1]] = (ev.type == KeyPress);
          break;
        }
      }
      f->mod = (!!(m & ControlMask)) | (!!(m & ShiftMask) << 1) |
               (!!(m & Mod1Mask) << 2) | (!!(m & Mod4Mask) << 3);
    } break;
    case ConfigureNotify:
      f->width = ev.xconfigure.width;
      f->height = ev.xconfigure.height;
      break;
    }
  }
  return 0;
}
#endif

#ifdef _WIN32
FENSTER_API void fenster_sleep(int64_t ms) { Sleep(ms); }
FENSTER_API int64_t fenster_time() {
  LARGE_INTEGER freq, count;
  QueryPerformanceFrequency(&freq);
  QueryPerformanceCounter(&count);
  return (int64_t)(count.QuadPart * 1000.0 / freq.QuadPart);
}
#else
FENSTER_API void fenster_sleep(int64_t ms) {
  struct timespec ts;
  ts.tv_sec = ms / 1000;
  ts.tv_nsec = (ms % 1000) * 1000000;
  nanosleep(&ts, NULL);
}
FENSTER_API int64_t fenster_time(void) {
  struct timespec time;
  clock_gettime(CLOCK_REALTIME, &time);
  return time.tv_sec * 1000 + (time.tv_nsec / 1000000);
}
#endif

#ifdef __cplusplus
class Fenster {
  struct fenster f;
  int64_t now;

public:
  Fenster(int w, int h, const char *title)
      : f{.title = title, .width = w, .height = h} {
    this->f.buf = new uint32_t[w * h];
    this->now = fenster_time();
    fenster_open(&this->f);
  }
  ~Fenster() {
    fenster_close(&this->f);
    delete[] this->f.buf;
  }
  bool loop(const int fps) {
    int64_t t = fenster_time();
    if (t - this->now < 1000 / fps) {
      fenster_sleep(t - now);
    }
    this->now = t;
    return fenster_loop(&this->f) == 0;
  }
  inline uint32_t &px(const int x, const int y) {
    return fenster_pixel(&this->f, x, y);
  }
  bool key(int c) { return c >= 0 && c < 128 ? this->f.keys[c] : false; }
  int x() { return this->f.x; }
  int y() { return this->f.y; }
  int mouse() { return this->f.mouse; }
  int mod() { return this->f.mod; }
};
#endif /* __cplusplus */

#endif /* !FENSTER_HEADER */
#endif /* FENSTER_H */
