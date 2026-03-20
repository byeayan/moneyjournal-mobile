import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { CHART_JS_BUNDLE_BASE64 } from '@/components/charts/chartJsBundle';
import colors from '@/utils/colors';

export type ChartKind = 'bar' | 'pie' | 'line';

type ChartWebViewProps = {
  chartType: ChartKind;
  data: Record<string, unknown>;
  options?: Record<string, unknown>;
  height?: number;
};

export default function ChartWebView({
  chartType,
  data,
  options,
  height = 260,
}: ChartWebViewProps) {
  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    if (event?.nativeEvent?.data) {
      console.log('[ChartWebView]', event.nativeEvent.data);
    }
  }, []);

  const html = useMemo(() => {
    const payload = JSON.stringify({
      type: chartType,
      data,
      options: options ?? {},
    });

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: ${colors.surface};
        color: ${colors.light};
        overflow: hidden;
      }
      #wrap {
        width: 100%;
        height: 100%;
        padding: 8px;
        box-sizing: border-box;
      }
      #chartCanvas {
        width: 100% !important;
        height: 100% !important;
      }
    </style>
  </head>
  <body>
    <div id="wrap">
      <canvas id="chartCanvas"></canvas>
    </div>
    <script>
      (function () {
        function sendMessage(message) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(message);
          }
        }

        window.onerror = function (message) {
          sendMessage('window.onerror: ' + message);
        };

        function decodeBase64(base64) {
          try {
            return decodeURIComponent(
              atob(base64)
                .split('')
                .map(function (c) {
                  return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
            );
          } catch (e) {
            return atob(base64);
          }
        }

        try {
          const chartJsCode = decodeBase64('${CHART_JS_BUNDLE_BASE64}');
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.text = chartJsCode;
          document.head.appendChild(script);

          const config = ${payload};
          const ctx = document.getElementById('chartCanvas').getContext('2d');

          if (typeof Chart === 'undefined') {
            document.body.innerHTML = '<div style="color:${colors.light};padding:16px;font-family:Arial,sans-serif;">Chart.js failed to load.</div>';
            sendMessage('Chart is undefined after script injection');
            return;
          }

          Chart.defaults.color = 'rgba(204, 198, 225, 0.82)';
          Chart.defaults.borderColor = 'rgba(86, 71, 135, 0.32)';
          Chart.defaults.font.family = 'Arial, sans-serif';

          const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: {
                labels: {
                  color: 'rgba(204, 198, 225, 0.78)'
                }
              }
            }
          };

          const axisOptions = config.type === 'pie'
            ? {}
            : {
                scales: {
                  x: {
                    ticks: { color: 'rgba(204, 198, 225, 0.72)' },
                    grid: { color: 'rgba(86, 71, 135, 0.24)' }
                  },
                  y: {
                    ticks: { color: 'rgba(204, 198, 225, 0.72)' },
                    grid: { color: 'rgba(86, 71, 135, 0.24)' }
                  }
                }
              };

          const mergedOptions = {
            ...baseOptions,
            ...axisOptions,
            ...config.options
          };

          new Chart(ctx, {
            type: config.type,
            data: config.data,
            options: mergedOptions
          });
          sendMessage('Chart rendered: ' + config.type);
        } catch (error) {
          const message = error && error.message ? error.message : 'Unknown WebView error';
          document.body.innerHTML = '<div style="color:${colors.light};padding:16px;font-family:Arial,sans-serif;">' + message + '</div>';
          sendMessage('catch: ' + message);
        }
      })();
    </script>
  </body>
</html>
`;
  }, [chartType, data, options]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
