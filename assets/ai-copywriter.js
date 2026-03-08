/**
 * AI Copywriter Engine — ConversionMax Pro
 *
 * Generates high-converting VSL scripts, headlines, CTAs, FAQs, and
 * guarantee copy using the merchant's own AI API key.
 *
 * Supports: OpenAI (GPT-4o), Anthropic (Claude), Google Gemini.
 * Runs ONLY in the Shopify theme editor (design_mode).
 */
(function () {
  'use strict';

  /* ---- Guard: only run inside the theme editor ---- */
  if (!window.Shopify || !Shopify.designMode) return;

  window.CMP = window.CMP || {};

  /* ================================================
     Config — pulled from theme settings via data attrs
     on the <script> tag that loads this file.
     ================================================ */
  var scriptTag = document.querySelector('script[data-ai-copywriter]');
  if (!scriptTag) return;

  /* Load product data from the JSON script tag (populated by Liquid product picker) */
  var productDataEl = document.querySelector('script[data-ai-product]');
  var productData = null;
  if (productDataEl) {
    try { productData = JSON.parse(productDataEl.textContent); } catch (e) { /* ignore parse errors */ }
  }

  var CFG = {
    provider:    scriptTag.getAttribute('data-provider') || 'openai',
    apiKey:      scriptTag.getAttribute('data-api-key') || '',
    tone:        scriptTag.getAttribute('data-tone') || 'urgent',
    product:     productData,
    productName: productData ? productData.title : '',
    productDesc: productData ? productData.description : '',
    audience:    scriptTag.getAttribute('data-audience') || '',
    painPoints:  scriptTag.getAttribute('data-pain-points') || '',
    benefits:    scriptTag.getAttribute('data-benefits') || '',
    socialProof: scriptTag.getAttribute('data-social-proof') || ''
  };

  /* ================================================
     Provider API adapters
     ================================================ */
  var providers = {
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      buildRequest: function (systemPrompt, userPrompt) {
        return {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + CFG.apiKey
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0.8,
            max_tokens: 2048,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        };
      },
      parseResponse: function (data) {
        return data.choices[0].message.content;
      }
    },

    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      buildRequest: function (systemPrompt, userPrompt) {
        return {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CFG.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt }
            ]
          })
        };
      },
      parseResponse: function (data) {
        return data.content[0].text;
      }
    },

    gemini: {
      buildEndpoint: function () {
        return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + CFG.apiKey;
      },
      buildRequest: function (systemPrompt, userPrompt) {
        return {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
          })
        };
      },
      parseResponse: function (data) {
        return data.candidates[0].content.parts[0].text;
      }
    }
  };

  /* ================================================
     Core generate function
     ================================================ */
  function generate(systemPrompt, userPrompt) {
    if (!CFG.apiKey) {
      return Promise.reject(new Error('No API key configured. Go to Theme Settings → AI Copywriter and add your API key.'));
    }

    var provider = providers[CFG.provider];
    if (!provider) {
      return Promise.reject(new Error('Unknown AI provider: ' + CFG.provider));
    }

    var endpoint = provider.buildEndpoint ? provider.buildEndpoint() : provider.endpoint;
    var request = provider.buildRequest(systemPrompt, userPrompt);

    return fetch(endpoint, request)
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (err) {
            var msg = (err.error && err.error.message) || r.statusText;
            throw new Error(CFG.provider.toUpperCase() + ' API error: ' + msg);
          });
        }
        return r.json();
      })
      .then(function (data) {
        return provider.parseResponse(data);
      });
  }

  /* ================================================
     Product context builder — shared across all prompts
     ================================================ */
  function buildProductContext() {
    var parts = [];
    var p = CFG.product;
    if (p) {
      parts.push('Product: ' + p.title);
      if (p.vendor) parts.push('Brand/Vendor: ' + p.vendor);
      if (p.type) parts.push('Product Type: ' + p.type);
      if (p.description) parts.push('Description: ' + p.description);
      if (p.price) parts.push('Price: ' + p.price);
      if (p.compare_at_price) parts.push('Compare-at Price: ' + p.compare_at_price);
      if (p.tags && p.tags.length) parts.push('Tags: ' + p.tags.join(', '));
    } else if (CFG.productName) {
      parts.push('Product/Brand: ' + CFG.productName);
      if (CFG.productDesc) parts.push('Description: ' + CFG.productDesc);
    }
    if (CFG.audience) parts.push('Target Audience: ' + CFG.audience);
    if (CFG.painPoints) parts.push('Customer Pain Points: ' + CFG.painPoints);
    if (CFG.benefits) parts.push('Key Benefits: ' + CFG.benefits);
    if (CFG.socialProof) parts.push('Social Proof: ' + CFG.socialProof);
    return parts.join('\n');
  }

  var toneDescriptions = {
    urgent: 'urgent, persuasive, high-energy direct-response style with scarcity and FOMO',
    friendly: 'warm, friendly, and approachable like talking to a helpful friend',
    professional: 'authoritative, professional, and trust-building with data and expertise',
    casual: 'casual, conversational, and relatable like a peer recommendation',
    luxury: 'premium, sophisticated, and exclusive with aspirational language'
  };

  /* ================================================
     Generation presets — each section type has its own
     ================================================ */
  CMP.ai = {
    config: CFG,

    generateVSLScript: function () {
      var context = buildProductContext();
      if (!context) {
        return Promise.reject(new Error('Please select a product in Theme Settings → AI Copywriter before generating.'));
      }

      var system = 'You are an elite direct-response copywriter who specializes in Video Sales Letter (VSL) scripts that convert. ' +
        'Your tone is: ' + (toneDescriptions[CFG.tone] || CFG.tone) + '. ' +
        'You write copy that grabs attention, agitates pain points, presents the solution, builds desire with social proof, and drives action.';

      var user = 'Write a complete VSL page copy for this product. Return it as JSON with these exact keys:\n' +
        '- "headline": A powerful attention-grabbing headline (max 15 words)\n' +
        '- "subheadline": A supporting subheadline that builds curiosity (max 25 words)\n' +
        '- "cta_text": A compelling call-to-action button text (max 6 words)\n' +
        '- "video_script": A full VSL script broken into sections. Return as a single string with section headers marked like [HOOK], [PROBLEM], [AGITATION], [SOLUTION], [BENEFITS], [SOCIAL PROOF], [OFFER], [GUARANTEE], [CTA]. Each section should be 2-4 sentences.\n\n' +
        'Product context:\n' + context + '\n\n' +
        'Return ONLY valid JSON, no markdown fences.';

      return generate(system, user).then(parseVSLResponse);
    },

    generateHeadlines: function () {
      var context = buildProductContext();
      if (!context) {
        return Promise.reject(new Error('Please select a product in Theme Settings → AI Copywriter before generating.'));
      }

      var system = 'You are an elite direct-response copywriter. ' +
        'Your tone is: ' + (toneDescriptions[CFG.tone] || CFG.tone) + '.';

      var user = 'Generate 5 different high-converting headline options for this product. ' +
        'Each should use a different proven copywriting framework (e.g., PAS, AIDA, curiosity gap, social proof, before/after). ' +
        'Return as JSON: { "headlines": [ { "text": "...", "framework": "..." } ] }\n\n' +
        'Product context:\n' + context + '\n\n' +
        'Return ONLY valid JSON, no markdown fences.';

      return generate(system, user).then(parseJSON);
    },

    generateFAQs: function (count) {
      var context = buildProductContext();
      if (!context) {
        return Promise.reject(new Error('Please select a product in Theme Settings → AI Copywriter before generating.'));
      }

      count = count || 6;

      var system = 'You are a conversion optimization expert who writes FAQs that handle objections and drive purchases. ' +
        'Your tone is: ' + (toneDescriptions[CFG.tone] || CFG.tone) + '.';

      var user = 'Generate ' + count + ' FAQ entries for this product that address common customer objections and concerns. ' +
        'Each answer should subtly reinforce the value proposition while being genuinely helpful. ' +
        'Return as JSON: { "faqs": [ { "question": "...", "answer": "..." } ] }\n\n' +
        'Product context:\n' + context + '\n\n' +
        'Return ONLY valid JSON, no markdown fences.';

      return generate(system, user).then(parseJSON);
    },

    generateGuarantee: function () {
      var context = buildProductContext();
      if (!context) {
        return Promise.reject(new Error('Please select a product in Theme Settings → AI Copywriter before generating.'));
      }

      var system = 'You are a conversion optimization expert who writes risk-reversal copy that eliminates purchase hesitation. ' +
        'Your tone is: ' + (toneDescriptions[CFG.tone] || CFG.tone) + '.';

      var user = 'Write a powerful money-back guarantee section for this product. ' +
        'Return as JSON: { "headline": "...", "body": "..." }\n' +
        'The headline should be bold and confident (max 8 words). ' +
        'The body should be 2-3 sentences explaining the guarantee, making the customer feel it is completely risk-free.\n\n' +
        'Product context:\n' + context + '\n\n' +
        'Return ONLY valid JSON, no markdown fences.';

      return generate(system, user).then(parseJSON);
    },

    generateSocialProof: function () {
      var context = buildProductContext();
      if (!context) {
        return Promise.reject(new Error('Please select a product in Theme Settings → AI Copywriter before generating.'));
      }

      var system = 'You are a marketing strategist who crafts compelling social proof elements. ' +
        'Your tone is: ' + (toneDescriptions[CFG.tone] || CFG.tone) + '.';

      var user = 'Generate social proof copy for this product. ' +
        'Return as JSON: { "stats": [ { "label": "...", "value": "..." } ], "trust_badges": ["...", "..."] }\n' +
        'Include 3 compelling stats and 3 trust badge texts.\n\n' +
        'Product context:\n' + context + '\n\n' +
        'Return ONLY valid JSON, no markdown fences.';

      return generate(system, user).then(parseJSON);
    },

    generateProductDescription: function () {
      var context = buildProductContext();
      if (!context) {
        return Promise.reject(new Error('Please select a product in Theme Settings → AI Copywriter before generating.'));
      }

      var system = 'You are an elite e-commerce copywriter who writes product descriptions that sell. ' +
        'Your tone is: ' + (toneDescriptions[CFG.tone] || CFG.tone) + '. ' +
        'You write benefit-driven copy that creates desire and overcomes objections.';

      var user = 'Write a compelling product description and supporting copy for this product. Return as JSON with these exact keys:\n' +
        '- "eyebrow": A short attention-grabbing label above the title (2-4 words, e.g., "Introducing", "New Arrival", "Best Seller")\n' +
        '- "badge_text": A badge/tag text (2-3 words, e.g., "Best Seller", "Limited Edition")\n' +
        '- "description": A persuasive product description (2-3 sentences) that highlights benefits and creates desire\n' +
        '- "cta_text": A compelling call-to-action button text (2-5 words)\n' +
        '- "highlights": An array of 4-6 short benefit bullet points (max 8 words each)\n\n' +
        'Product context:\n' + context + '\n\n' +
        'Return ONLY valid JSON, no markdown fences.';

      return generate(system, user).then(parseJSON);
    }
  };

  /* ================================================
     JSON parser helper — handles markdown code fences
     ================================================ */
  function parseJSON(text) {
    var cleaned = (text || '').trim();
    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch (e1) {
      try {
        return JSON.parse(repairLikelyJSON(cleaned));
      } catch (e2) {
        throw new Error('AI returned invalid JSON. Try again or use Copy manually.');
      }
    }
  }

  function repairLikelyJSON(input) {
    var s = String(input || '')
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2018|\u2019/g, "'");

    var firstBrace = s.indexOf('{');
    var lastBrace = s.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }

    s = s.replace(/,\s*([}\]])/g, '$1');
    return normalizeJSONStringContent(s);
  }

  
  function parseVSLResponse(text) {
    try {
      return parseJSON(text);
    } catch (e) {
      var raw = String(text || '').trim();
      return {
        headline: '',
        subheadline: '',
        cta_text: '',
        video_script: raw
      };
    }
  }

  /* ================================================
     UI Builder — creates the AI panel inside sections
     ================================================ */
  CMP.ai.createPanel = function (options) {
    options = options || {};
    /*
      options:
        container:  DOM element to append the panel to
        sectionType: 'vsl-hero' | 'faq' | 'guarantee'
        onGenerate: function(result) — called with the AI response
    */
    var panel = document.createElement('div');
    panel.className = 'cmp-ai-panel';

    var hasKey = !!CFG.apiKey;
    var hasProduct = !!CFG.product || !!CFG.productName;

    // Build panel HTML
    var html = '<div class="cmp-ai-panel__header">' +
      '<div class="cmp-ai-panel__logo">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M8.5 14.5A7 7 0 0 0 5 21h14a7 7 0 0 0-3.5-6.5"/><circle cx="12" cy="7" r="1"/></svg>' +
        ' AI Copywriter' +
      '</div>' +
      '<div class="cmp-ai-panel__provider">' + CFG.provider.toUpperCase() + '</div>' +
    '</div>';

    if (!hasKey) {
      html += '<div class="cmp-ai-panel__notice cmp-ai-panel__notice--warning">' +
        'Add your AI API key in <strong>Theme Settings → AI Copywriter</strong> to enable generation.' +
      '</div>';
    } else if (!hasProduct) {
      html += '<div class="cmp-ai-panel__notice cmp-ai-panel__notice--info">' +
        'Select a product in <strong>Theme Settings → AI Copywriter → Product</strong> for better results.' +
      '</div>';
    }

    // Section-specific generate buttons
    if (options.sectionType === 'vsl-hero') {
      html += '<div class="cmp-ai-panel__actions">' +
        '<button class="cmp-ai-panel__btn cmp-ai-panel__btn--primary" data-ai-action="vsl-script"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9998;</span> Generate Full VSL Script' +
        '</button>' +
        '<button class="cmp-ai-panel__btn" data-ai-action="headlines"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9733;</span> Generate 5 Headline Options' +
        '</button>' +
      '</div>';
    } else if (options.sectionType === 'faq') {
      html += '<div class="cmp-ai-panel__actions">' +
        '<button class="cmp-ai-panel__btn cmp-ai-panel__btn--primary" data-ai-action="faqs"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#10067;</span> Generate FAQs' +
        '</button>' +
      '</div>';
    } else if (options.sectionType === 'guarantee') {
      html += '<div class="cmp-ai-panel__actions">' +
        '<button class="cmp-ai-panel__btn cmp-ai-panel__btn--primary" data-ai-action="guarantee"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9989;</span> Generate Guarantee Copy' +
        '</button>' +
      '</div>';
    } else if (options.sectionType === 'social-proof') {
      html += '<div class="cmp-ai-panel__actions">' +
        '<button class="cmp-ai-panel__btn cmp-ai-panel__btn--primary" data-ai-action="social-proof"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9734;</span> Generate Social Proof' +
        '</button>' +
      '</div>';
    } else if (options.sectionType === 'main-product') {
      html += '<div class="cmp-ai-panel__actions">' +
        '<button class="cmp-ai-panel__btn cmp-ai-panel__btn--primary" data-ai-action="product-description"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9998;</span> Generate Product Description' +
        '</button>' +
        '<button class="cmp-ai-panel__btn" data-ai-action="vsl-script"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9733;</span> Generate VSL Script' +
        '</button>' +
        '<button class="cmp-ai-panel__btn" data-ai-action="headlines"' + (hasKey ? '' : ' disabled') + '>' +
          '<span class="cmp-ai-panel__btn-icon">&#9734;</span> Generate Headlines' +
        '</button>' +
      '</div>';
    }

    // Output area
    html += '<div class="cmp-ai-panel__output" data-ai-output style="display:none;"></div>';

    // Loading state
    html += '<div class="cmp-ai-panel__loading" data-ai-loading style="display:none;">' +
      '<div class="cmp-ai-panel__spinner"></div>' +
      '<span>Generating copy...</span>' +
    '</div>';

    panel.innerHTML = html;
    var panelStorageKey = getPanelStorageKey(options);

    // Wire up buttons
    var outputEl = panel.querySelector('[data-ai-output]');
    var loadingEl = panel.querySelector('[data-ai-loading]');
    restorePanelState(outputEl, panelStorageKey, options.sectionType);

    panel.querySelectorAll('[data-ai-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-ai-action');
        var generator;

        switch (action) {
          case 'vsl-script':  generator = CMP.ai.generateVSLScript; break;
          case 'headlines':   generator = CMP.ai.generateHeadlines; break;
          case 'faqs':        generator = CMP.ai.generateFAQs; break;
          case 'guarantee':   generator = CMP.ai.generateGuarantee; break;
          case 'social-proof': generator = CMP.ai.generateSocialProof; break;
          case 'product-description': generator = CMP.ai.generateProductDescription; break;
          default: return;
        }

        // Disable all buttons, show loading
        panel.querySelectorAll('.cmp-ai-panel__btn').forEach(function (b) { b.disabled = true; });
        loadingEl.style.display = '';
        outputEl.style.display = 'none';

        generator()
          .then(function (result) {
            loadingEl.style.display = 'none';
            outputEl.style.display = '';
            renderResult(outputEl, action, result, panelStorageKey, options.sectionType);
            persistPanelState(panelStorageKey, { action: action, data: result });
            if (options.onGenerate) options.onGenerate(result, action);
          })
          .catch(function (err) {
            loadingEl.style.display = 'none';
            outputEl.style.display = '';
            outputEl.innerHTML = '<div class="cmp-ai-panel__error">' + escapeHtml(err.message) + '</div>';
          })
          .finally(function () {
            panel.querySelectorAll('.cmp-ai-panel__btn').forEach(function (b) { b.disabled = !hasKey; });
          });
      });
    });

    if (options.container) {
      options.container.appendChild(panel);
    }

    return panel;
  };

  /* ================================================
     Result renderers
     ================================================ */
  function renderResult(container, action, data, panelStorageKey, sectionType) {
    var html = '';
    html += '<div class="cmp-ai-panel__hint">Apply updates preview only. Copy or select values and paste into sidebar settings.</div>';

    if (action === 'vsl-script') {
      var isVslHero = sectionType === 'vsl-hero';
      html += renderCopyField('Headline', data.headline, isVslHero ? 'vsl-headline' : 'title');
      html += renderCopyField('Subheadline', data.subheadline, isVslHero ? 'vsl-subheadline' : 'description');
      html += renderCopyField('CTA Button Text', data.cta_text, isVslHero ? 'vsl-cta' : 'button');
      if (data.video_script) {
        html += '<div class="cmp-ai-panel__field">' +
          '<label class="cmp-ai-panel__label">Full VSL Script</label>' +
          '<div class="cmp-ai-panel__script">' + formatScript(data.video_script) + '</div>' +
          '<button class="cmp-ai-panel__copy" data-copy-text="' + escapeAttr(data.video_script) + '">Copy Script</button>' +
        '</div>';
      }
    }

    else if (action === 'headlines') {
      html += '<div class="cmp-ai-panel__field"><label class="cmp-ai-panel__label">Headline Options</label>';
      (data.headlines || []).forEach(function (h, i) {
        html += '<div class="cmp-ai-panel__headline-option">' +
          '<span class="cmp-ai-panel__headline-num">' + (i + 1) + '</span>' +
          '<div>' +
            '<div class="cmp-ai-panel__headline-text">' + escapeHtml(h.text) + '</div>' +
            '<div class="cmp-ai-panel__headline-framework">' + escapeHtml(h.framework) + '</div>' +
          '</div>' +
          '<button class="cmp-ai-panel__apply cmp-ai-panel__apply--sm" data-apply-target="title" data-apply-value="' + escapeAttr(h.text) + '">Preview</button>' +
          '<button class="cmp-ai-panel__copy cmp-ai-panel__copy--sm" data-copy-text="' + escapeAttr(h.text) + '">Copy</button>' +
        '</div>';
      });
      html += '</div>';
    }

    else if (action === 'faqs') {
      html += '<div class="cmp-ai-panel__field"><label class="cmp-ai-panel__label">Generated FAQs</label>';
      (data.faqs || []).forEach(function (faq, i) {
        html += '<div class="cmp-ai-panel__faq-item">' +
          '<div class="cmp-ai-panel__faq-q"><strong>Q' + (i + 1) + ':</strong> ' + escapeHtml(faq.question) + '</div>' +
          '<div class="cmp-ai-panel__faq-a">' + escapeHtml(faq.answer) + '</div>' +
          '<div class="cmp-ai-panel__faq-actions">' +
            '<button class="cmp-ai-panel__copy cmp-ai-panel__copy--sm" data-copy-text="' + escapeAttr(faq.question) + '">Copy Question</button>' +
            '<button class="cmp-ai-panel__copy cmp-ai-panel__copy--sm" data-copy-text="' + escapeAttr(faq.answer) + '">Copy Answer</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    else if (action === 'guarantee') {
      html += renderCopyField('Headline', data.headline, 'guarantee-heading');
      html += renderCopyField('Body', data.body, 'guarantee-body');
    }

    else if (action === 'social-proof') {
      if (data.stats && data.stats.length) {
        html += '<div class="cmp-ai-panel__field"><label class="cmp-ai-panel__label">Stats</label>';
        data.stats.forEach(function (stat) {
          html += '<div class="cmp-ai-panel__headline-option">' +
            '<div><strong>' + escapeHtml(stat.value) + '</strong> - ' + escapeHtml(stat.label) + '</div>' +
            '<button class="cmp-ai-panel__copy cmp-ai-panel__copy--sm" data-copy-text="' + escapeAttr(stat.value + ' ' + stat.label) + '">Copy</button>' +
          '</div>';
        });
        html += '</div>';
      }
      if (data.trust_badges && data.trust_badges.length) {
        html += '<div class="cmp-ai-panel__field"><label class="cmp-ai-panel__label">Trust Badges</label>';
        data.trust_badges.forEach(function (badge) {
          html += '<div class="cmp-ai-panel__headline-option">' +
            '<div>' + escapeHtml(badge) + '</div>' +
            '<button class="cmp-ai-panel__copy cmp-ai-panel__copy--sm" data-copy-text="' + escapeAttr(badge) + '">Copy</button>' +
          '</div>';
        });
        html += '</div>';
      }
    }

    else if (action === 'product-description') {
      html += renderCopyField('Badge Text', data.badge_text, 'badge');
      html += renderCopyField('Eyebrow', data.eyebrow, 'vendor');
      html += renderCopyField('Long Description (sales copy)', data.description, 'long-description');
      html += renderCopyField('CTA Button', data.cta_text, 'button');

      if (data.highlights && data.highlights.length) {
        html += '<div class="cmp-ai-panel__field"><label class="cmp-ai-panel__label">Highlight Bullets</label>';
        data.highlights.forEach(function (h, i) {
          html += '<div class="cmp-ai-panel__headline-option">' +
            '<span class="cmp-ai-panel__headline-num">' + (i + 1) + '</span>' +
            '<div>' + escapeHtml(h) + '</div>' +
            '<button class="cmp-ai-panel__copy cmp-ai-panel__copy--sm" data-copy-text="' + escapeAttr(h) + '">Copy</button>' +
          '</div>';
        });
        html += '</div>';
      }

      var highlightsText = (data.highlights || []).join('\n');
      if (highlightsText) {
        html += renderCopyField('Highlights (one per line)', highlightsText, 'highlights');
      }

      html += '<div class="cmp-ai-panel__apply-all-wrap">' +
        '<button class="cmp-ai-panel__apply cmp-ai-panel__apply--all" data-apply-all="product-description">Apply All to Preview</button>' +
      '</div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-copy-text]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy-text');
        copyToClipboard(text).then(function () {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          btn.classList.add('cmp-ai-panel__copy--success');
          setTimeout(function () {
            btn.textContent = orig;
            btn.classList.remove('cmp-ai-panel__copy--success');
          }, 2000);
        }).catch(function () {});
      });
    });

    container.querySelectorAll('[data-apply-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-apply-target');
        var value = btn.getAttribute('data-apply-value');
        applyToPage(target, value);
        if (panelStorageKey) persistAppliedValue(panelStorageKey, target, value);
        btn.textContent = 'Applied!';
        btn.classList.add('cmp-ai-panel__apply--success');
        setTimeout(function () {
          btn.textContent = 'Preview';
          btn.classList.remove('cmp-ai-panel__apply--success');
        }, 2500);
      });
    });

    container.querySelectorAll('[data-apply-all]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('[data-apply-target]').forEach(function (applyBtn) {
          var target = applyBtn.getAttribute('data-apply-target');
          var value = applyBtn.getAttribute('data-apply-value');
          applyToPage(target, value);
          if (panelStorageKey) persistAppliedValue(panelStorageKey, target, value);
        });
        btn.textContent = 'Applied!';
        btn.classList.add('cmp-ai-panel__apply--success');
        setTimeout(function () {
          btn.textContent = 'Apply All to Preview';
          btn.classList.remove('cmp-ai-panel__apply--success');
        }, 2500);
      });
    });
  }
  function renderCopyField(label, value, applyTarget) {
    if (!value) return '';
    var applyBtn = '';
    if (applyTarget) {
      applyBtn = '<button class="cmp-ai-panel__apply" data-apply-target="' + escapeAttr(applyTarget) + '" data-apply-value="' + escapeAttr(value) + '">Preview</button>';
    }
    var rows = String(value).length > 180 ? 5 : 2;
    return '<div class="cmp-ai-panel__field">' +
      '<label class="cmp-ai-panel__label">' + label + '</label>' +
      '<textarea class="cmp-ai-panel__value-input" readonly rows="' + rows + '">' + escapeHtml(value) + '</textarea>' +
      '<div class="cmp-ai-panel__field-actions">' +
        applyBtn +
        '<button class="cmp-ai-panel__copy" data-copy-text="' + escapeAttr(value) + '">Copy</button>' +
      '</div>' +
    '</div>';
  }

  function formatScript(script) {
    return escapeHtml(script)
      .replace(/\[(HOOK|PROBLEM|AGITATION|SOLUTION|BENEFITS|SOCIAL PROOF|OFFER|GUARANTEE|CTA)\]/g,
        '<div class="cmp-ai-panel__script-section">$1</div>');
  }

  /* ================================================
     Utilities
     ================================================ */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ================================================
     Apply to page for instant preview only.
     Persisted save still requires copy/paste into
     section settings in the sidebar.
     ================================================ */

  var applyTargetSelectors = {
    'title':              '.cmp-main-product__title',
    'description':        '.cmp-main-product__description',
    'long-description':   '.cmp-main-product__description',
    'button':             '.cmp-main-product__button',
    'vendor':             '.cmp-main-product__eyebrow',
    'badge':              '.cmp-main-product__badge',
    'guarantee-heading':  '.cmp-guarantee__headline',
    'guarantee-body':     '.cmp-guarantee__body',
    'highlights':         '.cmp-main-product__highlights',
    'vsl-headline':       '.cmp-vsl-hero__headline',
    'vsl-subheadline':    '.cmp-vsl-hero__subheadline',
    'vsl-cta':            '.cmp-vsl-hero .cmp-btn'
  };

  function applyToPage(target, value) {
    // Special case: render highlights as bullet list under description.
    if (target === 'highlights') {
      var linesList = String(value || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
      var contentRoot = document.querySelector('.cmp-main-product__content');
      if (!contentRoot) return;
      var list = contentRoot.querySelector('.cmp-main-product__highlights');
      if (!list) {
        list = document.createElement('ul');
        list.className = 'cmp-main-product__highlights';
        var desc = contentRoot.querySelector('.cmp-main-product__description');
        if (desc && desc.parentNode) {
          desc.parentNode.insertBefore(list, desc.nextSibling);
        } else {
          contentRoot.appendChild(list);
        }
      }
      list.innerHTML = linesList.map(function (line) { return '<li>' + escapeHtml(line) + '</li>'; }).join('');
      list.style.display = linesList.length ? '' : 'none';
      list.classList.add('cmp-ai-applied');
      setTimeout(function () { list.classList.remove('cmp-ai-applied'); }, 1500);
      return;
    }

    // Update the DOM for instant visual feedback
    var selector = applyTargetSelectors[target];
    if (selector) {
      var els = document.querySelectorAll(selector);
      // If the element doesn't exist yet (e.g. badge), create it
      if (!els.length && target === 'badge') {
        var content = document.querySelector('.cmp-main-product__content');
        if (content) {
          var badge = document.createElement('span');
          badge.className = 'cmp-main-product__badge';
          content.insertBefore(badge, content.firstChild);
          els = [badge];
        }
      }
      if (!els.length && target === 'vendor') {
        var title = document.querySelector('.cmp-main-product__title');
        if (title) {
          var eyebrow = document.createElement('p');
          eyebrow.className = 'cmp-main-product__eyebrow';
          title.parentNode.insertBefore(eyebrow, title);
          els = [eyebrow];
        }
      }

      if (els.length) {
        (els.forEach ? els : [els]).forEach(function (el) {
          el.textContent = value;
          el.style.display = '';
          el.classList.add('cmp-ai-applied');
          setTimeout(function () { el.classList.remove('cmp-ai-applied'); }, 1500);
        });
      }
    }
  }

  function copyToClipboard(text) {
    if (!text) return Promise.resolve();

    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }

    return legacyCopy(text);
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (e) {
      copied = false;
    }

    document.body.removeChild(ta);

    if (!copied) {
      try { window.prompt('Copy this value (Ctrl/Cmd+C, Enter):', text); } catch (e) {}
    }

    return Promise.resolve();
  }

  function getPanelStorageKey(options) {
    var sectionType = options && options.sectionType ? options.sectionType : 'unknown';
    var sectionId = options && options.sectionId ? options.sectionId : ((options && options.container && options.container.getAttribute('data-section-id')) || '');
    var path = window.location && window.location.pathname ? window.location.pathname : '';
    var productRef = CFG.product && (CFG.product.id || CFG.product.handle || CFG.product.title)
      ? String(CFG.product.id || CFG.product.handle || CFG.product.title)
      : '';
    return ['cmp-ai-panel-v2', path, sectionType, sectionId, productRef].join(':');
  }

  function persistPanelState(storageKey, payload) {
    if (!storageKey) return;
    try {
      var current = JSON.parse(localStorage.getItem(storageKey) || '{}');
      current.latest = payload;
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch (e) {}
  }

  function persistAppliedValue(storageKey, target, value) {
    if (!storageKey || !target) return;
    try {
      var current = JSON.parse(localStorage.getItem(storageKey) || '{}');
      current.applied = current.applied || {};
      current.applied[target] = value;
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch (e) {}
  }

  function restorePanelState(outputEl, storageKey, sectionType) {
    if (!outputEl || !storageKey) return;
    try {
      var current = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (current.latest && current.latest.action && current.latest.data) {
        outputEl.style.display = '';
        renderResult(outputEl, current.latest.action, current.latest.data, storageKey, sectionType);
      }
      if (current.applied) {
        Object.keys(current.applied).forEach(function (target) {
          applyToPage(target, current.applied[target]);
        });
      }
    } catch (e) {}
  }

})();




