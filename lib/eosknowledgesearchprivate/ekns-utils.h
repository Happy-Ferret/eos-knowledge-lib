/* -*- mode: C; c-file-style: "gnu"; indent-tabs-mode: nil; -*- */

/* Copyright 2016 Endless Mobile, Inc. */

#pragma once

#include <gio/gio.h>

gboolean
ekns_utils_parallel_init (GSList        *initables,
                          int            io_priority,
                          GCancellable  *cancellable,
                          GError       **error);