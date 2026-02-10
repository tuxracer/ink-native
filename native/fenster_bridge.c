/**
 * Fenster Bridge
 *
 * Thin C wrapper around fenster.h for koffi FFI access.
 * Fenster uses inline/static functions that koffi can't call directly,
 * so this bridge exposes them as proper exported symbols.
 */

#include <stdlib.h>
#include <string.h>
#include "fenster.h"

typedef struct {
  struct fenster f;
  uint32_t *buf;
  char *title_copy;
  int resized;
  int prev_width;
  int prev_height;
  float prev_scale;
} fenster_bridge;

fenster_bridge *fenster_bridge_create(const char *title, int w, int h) {
  fenster_bridge *fb = calloc(1, sizeof(fenster_bridge));
  if (!fb)
    return NULL;

  fb->buf = calloc((size_t)w * (size_t)h, sizeof(uint32_t));
  if (!fb->buf) {
    free(fb);
    return NULL;
  }

  /* Copy title string so caller doesn't need to keep it alive */
  fb->title_copy = strdup(title);

  /* Initialize fenster struct */
  struct fenster init = {
      .title = fb->title_copy, .width = w, .height = h, .buf = fb->buf};
  memcpy(&fb->f, &init, sizeof(struct fenster));

  fb->prev_width = w;
  fb->prev_height = h;
  fb->prev_scale = 1.0f;
  fb->resized = 0;

  return fb;
}

int fenster_bridge_open(fenster_bridge *fb) {
  int result = fenster_open(&fb->f);
  if (result != 0) return result;

  /* Reallocate buffer at physical (scaled) dimensions */
  if (fb->f.phys_width != fb->prev_width ||
      fb->f.phys_height != fb->prev_height) {
    uint32_t *new_buf = calloc((size_t)fb->f.phys_width *
                               (size_t)fb->f.phys_height, sizeof(uint32_t));
    if (new_buf) {
      free(fb->buf);
      fb->buf = new_buf;
      fb->f.buf = new_buf;
      fb->prev_width = fb->f.phys_width;
      fb->prev_height = fb->f.phys_height;
    }
  }
  fb->prev_scale = fb->f.scale;

  return 0;
}

int fenster_bridge_loop(fenster_bridge *fb) {
  int result = fenster_loop(&fb->f);

  /* Detect resize by physical dimensions (catches both logical resize and
   * scale changes, e.g. window moved to a different-DPI display) */
  if (fb->f.phys_width != fb->prev_width ||
      fb->f.phys_height != fb->prev_height) {
    int newW = fb->f.phys_width;
    int newH = fb->f.phys_height;

    /* Reallocate pixel buffer at physical dimensions */
    uint32_t *new_buf = calloc((size_t)newW * (size_t)newH, sizeof(uint32_t));
    if (new_buf) {
      free(fb->buf);
      fb->buf = new_buf;
      fb->f.buf = new_buf;

#if !defined(__APPLE__) && !defined(_WIN32)
      /* Linux: recreate XImage with new buffer */
      if (fb->f.img) {
        fb->f.img->data = NULL; /* prevent XDestroyImage from freeing our buf */
        XDestroyImage(fb->f.img);
      }
      fb->f.img =
          XCreateImage(fb->f.dpy, DefaultVisual(fb->f.dpy, 0), 24, ZPixmap, 0,
                       (char *)new_buf, newW, newH, 32, 0);
#endif

      fb->resized = 1;
      fb->prev_width = newW;
      fb->prev_height = newH;
      fb->prev_scale = fb->f.scale;
    }
  }

  return result;
}

void fenster_bridge_close(fenster_bridge *fb) {
  if (!fb)
    return;
  fenster_close(&fb->f);
  free(fb->buf);
  free(fb->title_copy);
  free(fb);
}

uint32_t *fenster_bridge_get_buf(fenster_bridge *fb) { return fb->buf; }

void fenster_bridge_copy_buf(fenster_bridge *fb, const void *src,
                             int byte_length) {
  memcpy(fb->buf, src, (size_t)byte_length);
}

int *fenster_bridge_get_keys(fenster_bridge *fb) { return fb->f.keys; }

int fenster_bridge_get_mod(fenster_bridge *fb) { return fb->f.mod; }

void fenster_bridge_get_size(fenster_bridge *fb, int *w, int *h) {
  *w = fb->f.width;
  *h = fb->f.height;
}

int fenster_bridge_get_resized(fenster_bridge *fb, int *w, int *h) {
  int was_resized = fb->resized;
  *w = fb->f.phys_width;
  *h = fb->f.phys_height;
  fb->resized = 0;
  return was_resized;
}

float fenster_bridge_get_scale(fenster_bridge *fb) { return fb->f.scale; }

void fenster_bridge_set_scale(fenster_bridge *fb, float scale) {
  fb->f.scale = scale;
  fb->f.phys_width = (int)(fb->f.width * scale);
  fb->f.phys_height = (int)(fb->f.height * scale);
}
