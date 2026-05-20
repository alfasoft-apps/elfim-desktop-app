import { ref, watch, type Ref } from 'vue';

import { resolveImageUrl } from '../utils/image-url';

import { useNetworkStatusStore } from '../stores/networkStatus';



/** Uzaq URL; keş varsa `elfim-cache://` ilə əvəz olunur. */

export function useCachedImageUrl(

  getRaw: () => string | null | undefined,

): Ref<string | undefined> {

  const displayUrl = ref<string | undefined>();

  let loadGen = 0;



  const network = useNetworkStatusStore();



  watch(

    () => ({ raw: getRaw(), online: network.isOnline }),

    async ({ raw, online }) => {

      const gen = ++loadGen;

      const remote = resolveImageUrl(raw ?? undefined);



      if (!remote) {

        displayUrl.value = undefined;

        return;

      }



      const elfim = window.elfim;

      if (!elfim?.resolveCachedImage && !elfim?.resolveOrCacheImage) {

        displayUrl.value = online ? remote : undefined;

        return;

      }



      try {

        if (elfim.resolveCachedImage) {

          const local = await elfim.resolveCachedImage(remote);

          if (gen !== loadGen) return;

          if (local) {

            displayUrl.value = local;

            return;

          }

        }

      } catch {

        /* ignore */

      }



      if (gen !== loadGen) return;



      if (online) {

        displayUrl.value = remote;

        if (elfim.resolveOrCacheImage) {

          void elfim.resolveOrCacheImage(remote, true).then((cached) => {

            if (gen === loadGen && cached) displayUrl.value = cached;

          });

        }

        return;

      }



      displayUrl.value = undefined;

    },

    { immediate: true },

  );



  return displayUrl;

}

